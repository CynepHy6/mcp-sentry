import { appendFile, mkdir, writeFile } from "fs/promises";
import path from "path";
const DEFAULT_EXPORT_DIRECTORY = path.resolve(process.cwd(), "tmp", "sentry-exports");
const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_FETCH_CONCURRENCY = 10;
function normalizeUtcDateString(inputValue) {
    const plainDatePattern = /^\d{4}-\d{2}-\d{2}$/;
    const zonelessDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/;
    let normalizedValue = inputValue.trim();
    if (plainDatePattern.test(normalizedValue)) {
        normalizedValue = `${normalizedValue}T00:00:00.000Z`;
    }
    else if (zonelessDateTimePattern.test(normalizedValue)) {
        normalizedValue = `${normalizedValue}Z`;
    }
    const parsedDate = new Date(normalizedValue);
    if (Number.isNaN(parsedDate.getTime())) {
        throw new Error(`Invalid since value "${inputValue}". Use YYYY-MM-DD or an ISO timestamp in UTC.`);
    }
    return parsedDate.toISOString();
}
function normalizeUtcUntilDateString(inputValue) {
    const plainDatePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (plainDatePattern.test(inputValue.trim())) {
        return `${inputValue.trim()}T23:59:59.999Z`;
    }
    return normalizeUtcDateString(inputValue);
}
function sanitizeFileNamePart(inputValue) {
    return inputValue.replace(/[^a-zA-Z0-9._-]+/g, "-");
}
function extractIssueReference(issueIdOrUrl, organizationSlug) {
    if (!issueIdOrUrl.startsWith("http")) {
        return {
            issueId: issueIdOrUrl,
            organizationSlug,
        };
    }
    const issueUrl = new URL(issueIdOrUrl);
    const pathParts = issueUrl.pathname.split("/").filter(Boolean);
    if (pathParts.length < 4 || pathParts[0] !== "organizations") {
        throw new Error(`Unsupported issue URL: ${issueIdOrUrl}`);
    }
    const extractedOrganizationSlug = pathParts[1];
    if (pathParts[2] !== "issues") {
        throw new Error(`Unsupported issue URL: ${issueIdOrUrl}`);
    }
    return {
        issueId: pathParts[3],
        organizationSlug: extractedOrganizationSlug || organizationSlug,
    };
}
function getNestedValue(targetValue, fieldPath) {
    const pathSegments = fieldPath.split(".").filter(Boolean);
    let currentValue = targetValue;
    for (const pathSegment of pathSegments) {
        if (currentValue === null ||
            currentValue === undefined ||
            typeof currentValue !== "object" ||
            !(pathSegment in currentValue)) {
            return undefined;
        }
        currentValue = currentValue[pathSegment];
    }
    return currentValue;
}
function buildAdditionalData(eventPayload) {
    const additionalData = {};
    const directSources = ["context", "contexts", "extra"];
    for (const sourceKey of directSources) {
        const sourceValue = eventPayload[sourceKey];
        if (sourceValue &&
            typeof sourceValue === "object" &&
            !Array.isArray(sourceValue)) {
            Object.assign(additionalData, sourceValue);
        }
    }
    const entriesValue = eventPayload.entries;
    if (!Array.isArray(entriesValue)) {
        return additionalData;
    }
    for (const entryValue of entriesValue) {
        if (!entryValue || typeof entryValue !== "object") {
            continue;
        }
        const entryRecord = entryValue;
        const entryData = entryRecord.data;
        if (!entryData || typeof entryData !== "object") {
            continue;
        }
        const framesValue = entryData.frames;
        if (!Array.isArray(framesValue)) {
            continue;
        }
        for (const frameValue of [...framesValue].reverse()) {
            if (!frameValue || typeof frameValue !== "object") {
                continue;
            }
            const frameVariables = frameValue.vars;
            if (!frameVariables || typeof frameVariables !== "object") {
                continue;
            }
            const contextValue = frameVariables.context;
            if (contextValue &&
                typeof contextValue === "object" &&
                !Array.isArray(contextValue)) {
                Object.assign(additionalData, contextValue);
            }
            const recordValue = frameVariables.record;
            if (!recordValue || typeof recordValue !== "object") {
                continue;
            }
            const recordContext = recordValue.context;
            if (recordContext &&
                typeof recordContext === "object" &&
                !Array.isArray(recordContext)) {
                Object.assign(additionalData, recordContext);
            }
            const recordExtra = recordValue.extra;
            if (recordExtra &&
                typeof recordExtra === "object" &&
                !Array.isArray(recordExtra)) {
                Object.assign(additionalData, recordExtra);
            }
        }
    }
    return additionalData;
}
function normalizeStringValue(inputValue) {
    if (typeof inputValue !== "string") {
        return undefined;
    }
    const normalizedValue = inputValue.trim();
    return normalizedValue ? normalizedValue : undefined;
}
function collectUniqueStringValues(inputValues) {
    const uniqueValues = new Set();
    for (const inputValue of inputValues) {
        const normalizedValue = normalizeStringValue(inputValue);
        if (normalizedValue) {
            uniqueValues.add(normalizedValue);
        }
    }
    return Array.from(uniqueValues);
}
function getExceptionMessageField(eventPayload, additionalData) {
    const explicitExceptionMessage = normalizeStringValue(additionalData.exceptionMessage);
    if (explicitExceptionMessage) {
        return {
            value: explicitExceptionMessage,
            sourcePath: "additionalData.exceptionMessage",
            allValues: [explicitExceptionMessage],
        };
    }
    const entriesValue = eventPayload.entries;
    if (!Array.isArray(entriesValue)) {
        return {};
    }
    const exceptionValues = [];
    for (let entryIndex = 0; entryIndex < entriesValue.length; entryIndex += 1) {
        const entryValue = entriesValue[entryIndex];
        if (!entryValue || typeof entryValue !== "object") {
            continue;
        }
        const entryRecord = entryValue;
        if (entryRecord.type !== "exception") {
            continue;
        }
        const entryData = entryRecord.data;
        if (!entryData || typeof entryData !== "object") {
            continue;
        }
        const valuesList = entryData.values;
        if (!Array.isArray(valuesList)) {
            continue;
        }
        for (let valueIndex = 0; valueIndex < valuesList.length; valueIndex += 1) {
            const exceptionValue = valuesList[valueIndex];
            if (!exceptionValue || typeof exceptionValue !== "object") {
                continue;
            }
            const normalizedValue = normalizeStringValue(exceptionValue.value);
            if (normalizedValue) {
                exceptionValues.push(normalizedValue);
            }
        }
    }
    const uniqueExceptionValues = collectUniqueStringValues(exceptionValues);
    if (uniqueExceptionValues.length > 0) {
        return {
            value: uniqueExceptionValues[0],
            sourcePath: "event.entries[].data.values[].value",
            allValues: uniqueExceptionValues,
        };
    }
    const fallbackMessage = normalizeStringValue(eventPayload.message);
    if (fallbackMessage) {
        return {
            value: fallbackMessage,
            sourcePath: "event.message",
            allValues: [fallbackMessage],
        };
    }
    return {};
}
function getEventTitleField(eventPayload) {
    const titleValue = normalizeStringValue(eventPayload.title);
    if (titleValue) {
        return {
            value: titleValue,
            sourcePath: "event.title",
            allValues: [titleValue],
        };
    }
    const metadataValue = getNestedValue(eventPayload, "metadata.title");
    const metadataTitle = normalizeStringValue(metadataValue);
    if (metadataTitle) {
        return {
            value: metadataTitle,
            sourcePath: "event.metadata.title",
            allValues: [metadataTitle],
        };
    }
    return {};
}
function recursiveKeySearch(targetValue, keyName, sourcePath, visitedObjects, matches) {
    if (targetValue === null || targetValue === undefined) {
        return;
    }
    if (Array.isArray(targetValue)) {
        targetValue.forEach((arrayItem, arrayIndex) => {
            recursiveKeySearch(arrayItem, keyName, `${sourcePath}[${arrayIndex}]`, visitedObjects, matches);
        });
        return;
    }
    if (typeof targetValue !== "object") {
        return;
    }
    if (visitedObjects.has(targetValue)) {
        return;
    }
    visitedObjects.add(targetValue);
    const recordValue = targetValue;
    for (const [childKey, childValue] of Object.entries(recordValue)) {
        const childPath = sourcePath ? `${sourcePath}.${childKey}` : childKey;
        if (childKey === keyName) {
            matches.push({
                sourcePath: childPath,
                value: childValue,
            });
        }
        recursiveKeySearch(childValue, keyName, childPath, visitedObjects, matches);
    }
}
function deduplicateMatches(matches) {
    const seenMatches = new Set();
    return matches.filter((matchValue) => {
        const matchKey = `${matchValue.sourcePath}:${JSON.stringify(matchValue.value)}`;
        if (seenMatches.has(matchKey)) {
            return false;
        }
        seenMatches.add(matchKey);
        return true;
    });
}
function extractFieldsFromEvent(eventPayload, fieldPaths) {
    const additionalData = buildAdditionalData(eventPayload);
    const searchTargets = [
        { name: "additionalData", value: additionalData },
        { name: "event", value: eventPayload },
    ];
    const extractedFields = {};
    const sourcePaths = {};
    const derivedFields = {};
    const derivedSourcePaths = {};
    const exceptionMessageField = getExceptionMessageField(eventPayload, additionalData);
    if (exceptionMessageField.value) {
        derivedFields.exceptionMessage = exceptionMessageField.value;
        if (exceptionMessageField.sourcePath) {
            derivedSourcePaths.exceptionMessage = [
                exceptionMessageField.sourcePath,
            ];
        }
        if (exceptionMessageField.allValues &&
            exceptionMessageField.allValues.length > 1) {
            derivedFields.exceptionMessages = exceptionMessageField.allValues;
        }
    }
    const eventTitleField = getEventTitleField(eventPayload);
    if (eventTitleField.value) {
        derivedFields.eventTitle = eventTitleField.value;
        if (eventTitleField.sourcePath) {
            derivedSourcePaths.eventTitle = [eventTitleField.sourcePath];
        }
    }
    for (const fieldPath of fieldPaths) {
        const matches = [];
        for (const searchTarget of searchTargets) {
            const exactValue = getNestedValue(searchTarget.value, fieldPath);
            if (exactValue !== undefined) {
                matches.push({
                    sourcePath: `${searchTarget.name}.${fieldPath}`,
                    value: exactValue,
                });
            }
        }
        if (matches.length === 0 && !fieldPath.includes(".")) {
            const visitedObjects = new WeakSet();
            for (const searchTarget of searchTargets) {
                recursiveKeySearch(searchTarget.value, fieldPath, searchTarget.name, visitedObjects, matches);
            }
        }
        const uniqueMatches = deduplicateMatches(matches);
        if (uniqueMatches.length === 0) {
            continue;
        }
        sourcePaths[fieldPath] = uniqueMatches.map((matchValue) => matchValue.sourcePath);
        extractedFields[fieldPath] =
            uniqueMatches.length === 1
                ? uniqueMatches[0].value
                : uniqueMatches.map((matchValue) => matchValue.value);
    }
    return {
        extractedFields,
        sourcePaths,
        derivedFields,
        derivedSourcePaths,
    };
}
async function mapWithConcurrency(inputValues, concurrencyLimit, mapperFunction) {
    let currentIndex = 0;
    async function workerFunction() {
        while (true) {
            const workerIndex = currentIndex;
            currentIndex += 1;
            if (workerIndex >= inputValues.length) {
                return;
            }
            await mapperFunction(inputValues[workerIndex], workerIndex);
        }
    }
    const workerCount = Math.min(concurrencyLimit, inputValues.length);
    await Promise.all(Array.from({ length: workerCount }, () => workerFunction()));
}
async function resolveIssueContext(apiClient, issueIdOrUrl, organizationSlug, since, until) {
    const issueReference = extractIssueReference(issueIdOrUrl, organizationSlug);
    const issueDetails = await apiClient.getIssueDetails(issueReference.issueId);
    const sinceUtc = normalizeUtcDateString(since);
    const untilUtc = until ? normalizeUtcUntilDateString(until) : undefined;
    if (untilUtc && new Date(untilUtc) < new Date(sinceUtc)) {
        throw new Error(`Invalid date range: until (${untilUtc}) is earlier than since (${sinceUtc})`);
    }
    return {
        ...issueReference,
        issueTitle: issueDetails.title,
        projectSlug: issueDetails.project.slug,
        sinceUtc,
        untilUtc,
    };
}
async function collectMatchingEventSummaries(apiClient, issueContext) {
    const sinceDate = new Date(issueContext.sinceUtc);
    const untilDate = issueContext.untilUtc
        ? new Date(issueContext.untilUtc)
        : null;
    const matchingSummaries = [];
    let paginationCursor = null;
    let scannedEventCount = 0;
    while (true) {
        const eventsPage = await apiClient.getIssueEventsPage(issueContext.organizationSlug, issueContext.issueId, {
            cursor: paginationCursor || undefined,
            perPage: DEFAULT_PAGE_SIZE,
        });
        if (eventsPage.data.length === 0) {
            break;
        }
        scannedEventCount += eventsPage.data.length;
        const pageEventTimestamps = [];
        for (const eventSummaryValue of eventsPage.data) {
            const eventSummary = eventSummaryValue;
            const dateCreatedValue = eventSummary.dateCreated;
            const eventTimestamp = new Date(String(dateCreatedValue));
            if (Number.isNaN(eventTimestamp.getTime())) {
                matchingSummaries.push(eventSummary);
                continue;
            }
            pageEventTimestamps.push(eventTimestamp);
            if (untilDate && eventTimestamp > untilDate) {
                continue;
            }
            if (eventTimestamp >= sinceDate) {
                matchingSummaries.push(eventSummary);
            }
        }
        const allEventsOlderThanSince = pageEventTimestamps.length > 0 &&
            pageEventTimestamps.every((eventTimestamp) => eventTimestamp < sinceDate);
        if (!eventsPage.nextCursor || allEventsOlderThanSince) {
            break;
        }
        paginationCursor = eventsPage.nextCursor;
    }
    return {
        eventSummaries: matchingSummaries,
        scannedEventCount,
    };
}
function createExportFilePath(issueContext, exportKind, outputDirectory) {
    const baseDirectory = outputDirectory
        ? path.resolve(process.cwd(), outputDirectory)
        : DEFAULT_EXPORT_DIRECTORY;
    const timestampLabel = new Date().toISOString().replace(/[:.]/g, "-");
    const sinceLabel = sanitizeFileNamePart(issueContext.sinceUtc);
    const untilLabel = issueContext.untilUtc
        ? `-until-${sanitizeFileNamePart(issueContext.untilUtc)}`
        : "";
    const issueLabel = sanitizeFileNamePart(issueContext.issueId);
    return path.join(baseDirectory, `${exportKind}-issue-${issueLabel}-since-${sinceLabel}${untilLabel}-${timestampLabel}.jsonl`);
}
function createEventExportLine(eventPayload, issueContext) {
    const exportRecord = {
        issueId: issueContext.issueId,
        issueTitle: issueContext.issueTitle,
        projectSlug: issueContext.projectSlug,
        organizationSlug: issueContext.organizationSlug,
        exportedAt: new Date().toISOString(),
        event: eventPayload,
    };
    return JSON.stringify(exportRecord);
}
function createFieldExportLine(eventPayload, issueContext, fieldPaths) {
    const extractionResult = extractFieldsFromEvent(eventPayload, fieldPaths);
    if (Object.keys(extractionResult.extractedFields).length === 0) {
        return null;
    }
    const exportRecord = {
        issueId: issueContext.issueId,
        issueTitle: issueContext.issueTitle,
        projectSlug: issueContext.projectSlug,
        organizationSlug: issueContext.organizationSlug,
        exportedAt: new Date().toISOString(),
        eventId: eventPayload.eventID || eventPayload.id,
        eventTimestamp: eventPayload.dateCreated,
        ...extractionResult.derivedFields,
        extractedFields: extractionResult.extractedFields,
        derivedSourcePaths: extractionResult.derivedSourcePaths,
        sourcePaths: extractionResult.sourcePaths,
    };
    return JSON.stringify(exportRecord);
}
async function prepareExportFile(exportPath) {
    await mkdir(path.dirname(exportPath), { recursive: true });
    await writeFile(exportPath, "", "utf8");
}
async function exportMatchingEvents(apiClient, issueContext, matchingSummaries, exportPath, lineFactory) {
    let processedEventCount = 0;
    const pendingLines = new Array(matchingSummaries.length);
    await mapWithConcurrency(matchingSummaries, DEFAULT_FETCH_CONCURRENCY, async (eventSummary, summaryIndex) => {
        const eventIdentifier = String(eventSummary.eventID || eventSummary.id || "").trim();
        if (!eventIdentifier) {
            return;
        }
        const eventPayload = (await apiClient.getProjectEvent(issueContext.organizationSlug, issueContext.projectSlug, eventIdentifier));
        const exportLine = lineFactory(eventPayload);
        if (exportLine) {
            pendingLines[summaryIndex] = exportLine;
            processedEventCount += 1;
        }
    });
    const fileContent = pendingLines.filter(Boolean).join("\n");
    if (fileContent) {
        await appendFile(exportPath, `${fileContent}\n`, "utf8");
    }
    return processedEventCount;
}
export async function exportIssueEventsToFile(apiClient, inputValues) {
    const issueContext = await resolveIssueContext(apiClient, inputValues.issueIdOrUrl, inputValues.organizationSlug, inputValues.since, inputValues.until);
    const exportPath = createExportFilePath(issueContext, "events", inputValues.outputDirectory);
    await prepareExportFile(exportPath);
    const { eventSummaries, scannedEventCount } = await collectMatchingEventSummaries(apiClient, issueContext);
    const processedEventCount = await exportMatchingEvents(apiClient, issueContext, eventSummaries, exportPath, (eventPayload) => createEventExportLine(eventPayload, issueContext));
    return {
        issueContext,
        matchingEventCount: eventSummaries.length,
        scannedEventCount,
        processedEventCount,
        exportPath,
    };
}
export async function exportIssueEventFieldsToFile(apiClient, inputValues) {
    const issueContext = await resolveIssueContext(apiClient, inputValues.issueIdOrUrl, inputValues.organizationSlug, inputValues.since, inputValues.until);
    const exportPath = createExportFilePath(issueContext, "fields", inputValues.outputDirectory);
    await prepareExportFile(exportPath);
    const { eventSummaries, scannedEventCount } = await collectMatchingEventSummaries(apiClient, issueContext);
    const processedEventCount = await exportMatchingEvents(apiClient, issueContext, eventSummaries, exportPath, (eventPayload) => createFieldExportLine(eventPayload, issueContext, inputValues.fieldPaths));
    return {
        issueContext,
        matchingEventCount: eventSummaries.length,
        scannedEventCount,
        processedEventCount,
        exportPath,
    };
}
