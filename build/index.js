#!/usr/bin/env node
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();
try {
    dotenv.config({ path: path.resolve(__dirname, "../.env") });
}
catch (e) {
    console.error("Error loading .env file:", e);
}
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { SentrySdkClient } from "./api/sentrySdkClient.js";
import { IssueFormatter } from "./formatters/issueFormatter.js";
import { ProjectFormatter } from "./formatters/projectFormatter.js";
import { exportIssueEventFieldsToFile, exportIssueEventsToFile, } from "./utils/eventExport.js";
import { ErrorHandler } from "./utils/errorHandler.js";
// Validate environment variables
const SENTRY_AUTH = process.env.SENTRY_AUTH;
if (!SENTRY_AUTH) {
    console.error("Error: SENTRY_AUTH environment variable is required");
    process.exit(1);
}
const PROTOCOL = process.env.PROTOCOL || "https";
let sentryHost = process.env.SENTRY_HOST || "sentry.io";
if (sentryHost &&
    !sentryHost.startsWith("http://") &&
    !sentryHost.startsWith("https://")) {
    sentryHost = `${PROTOCOL}://${sentryHost}`;
}
// Initialize API client (@sentry/api)
const sentryClient = new SentrySdkClient(sentryHost, SENTRY_AUTH);
// Initialize server
const server = new McpServer({
    name: "Sentry",
    version: "1.4.1",
});
// List projects tool
server.tool("list_projects", "List accessible Sentry projects. View project slugs, IDs, status, settings, features, and organization details.", {
    organization_slug: z
        .string()
        .describe("The slug of the organization to list projects from"),
    view: z
        .enum(["summary", "detailed"])
        .default("detailed")
        .describe("View type (default: detailed)"),
    format: z
        .enum(["plain", "markdown"])
        .default("markdown")
        .describe("Output format (default: markdown)"),
}, async ({ organization_slug, view, format, }) => {
    try {
        const projects = await sentryClient.getProjects(organization_slug);
        const formatter = new ProjectFormatter({ format, view });
        const output = formatter.formatData(projects);
        return {
            content: [
                {
                    type: "text",
                    text: output,
                },
            ],
        };
    }
    catch (error) {
        return ErrorHandler.handleApiError(error, "list_projects");
    }
});
// List project issues tool
server.tool("list_project_issues", "List issues from a Sentry project. Monitor issue status, severity, frequency, and timing. Supports search queries using Sentry's query syntax. When query is provided, filters issues by status, level, assignment, or text content in title/description. Multiple filters can be combined with spaces. Examples: 'is:unresolved level:error' finds unresolved errors, 'video.skysvc.link' searches for text in issue titles/descriptions, 'assigned:me' finds issues assigned to current user.", {
    organization_slug: z
        .string()
        .describe("The slug of the organization the project belongs to"),
    project_slug: z
        .string()
        .describe("The slug of the project to list issues from"),
    query: z
        .string()
        .optional()
        .describe("Optional search query to filter issues. Supports Sentry query syntax:\n" +
        "- Status filters: 'is:unresolved', 'is:resolved', 'is:ignored'\n" +
        "- Level filters: 'level:error', 'level:fatal', 'level:warning', 'level:info'\n" +
        "- Assignment: 'assigned:me', 'assigned:username'\n" +
        "- Text search: any text string searches in issue titles and descriptions (e.g., 'video.skysvc.link', '404', 'timeout')\n" +
        "- Combine filters: use spaces to combine multiple filters (e.g., 'is:unresolved level:error video')\n" +
        "Examples: 'is:unresolved level:error' (unresolved errors), 'video.skysvc.link' (text search), 'assigned:me' (my issues), 'is:unresolved level:error 404' (unresolved errors containing '404')."),
    view: z
        .enum(["summary", "detailed"])
        .default("detailed")
        .describe("View type (default: detailed)"),
    format: z
        .enum(["plain", "markdown"])
        .default("markdown")
        .describe("Output format (default: markdown)"),
}, async ({ organization_slug, project_slug, query, view, format, }) => {
    try {
        const issues = await sentryClient.getProjectIssues(organization_slug, project_slug, query);
        const formatter = new IssueFormatter({ format, view });
        const output = formatter.formatIssueList(issues, project_slug);
        return {
            content: [
                {
                    type: "text",
                    text: output,
                },
            ],
        };
    }
    catch (error) {
        return ErrorHandler.handleApiError(error, "list_project_issues");
    }
});
// Get Sentry issue tool
server.tool("get_sentry_issue", "Retrieve and analyze a Sentry issue. Accepts issue URL or ID.", {
    issue_id_or_url: z
        .string()
        .describe("Either a full Sentry issue URL or just the numeric issue ID"),
    organization_slug: z
        .string()
        .describe("The slug of the organization the issue belongs to"),
    view: z
        .enum(["summary", "detailed"])
        .default("detailed")
        .describe("View type (default: detailed)"),
    format: z
        .enum(["plain", "markdown"])
        .default("markdown")
        .describe("Output format (default: markdown)"),
}, async ({ issue_id_or_url, organization_slug, view, format, }) => {
    try {
        // Extract issue ID from URL if provided
        let issueId = issue_id_or_url;
        if (issue_id_or_url.startsWith("http")) {
            const url = new URL(issue_id_or_url);
            const pathParts = url.pathname
                .split("/")
                .filter((part) => part);
            if (pathParts.length >= 4 && pathParts[2] === "issues") {
                issueId = pathParts[3];
            }
        }
        const issue = await sentryClient.getIssue(organization_slug, issueId);
        const formatter = new IssueFormatter({ format, view });
        const output = formatter.formatIssueDetails(issue);
        return {
            content: [
                {
                    type: "text",
                    text: output,
                },
            ],
        };
    }
    catch (error) {
        return ErrorHandler.handleApiError(error, "get_sentry_issue");
    }
});
// List issue events tool
server.tool("list_issue_events", "List events for a specific Sentry issue. Analyze event details, metadata, and patterns.", {
    organization_slug: z
        .string()
        .describe("The slug of the organization the issue belongs to"),
    issue_id: z.string().describe("The ID of the issue to list events for"),
    view: z
        .enum(["summary", "detailed"])
        .default("detailed")
        .describe("View type (default: detailed)"),
    format: z
        .enum(["plain", "markdown"])
        .default("markdown")
        .describe("Output format (default: markdown)"),
}, async ({ organization_slug, issue_id, view, format, }) => {
    try {
        const events = await sentryClient.getIssueEvents(organization_slug, issue_id);
        const formatter = new IssueFormatter({ format, view });
        const output = formatter.formatEventList(events, `Issue ${issue_id}`);
        return {
            content: [
                {
                    type: "text",
                    text: output,
                },
            ],
        };
    }
    catch (error) {
        return ErrorHandler.handleApiError(error, "list_issue_events");
    }
});
// Resolve short ID tool
server.tool("resolve_short_id", "Retrieve details about an issue using its short ID. Maps short IDs to issue details, project context, and status.", {
    organization_slug: z
        .string()
        .describe("The slug of the organization the issue belongs to"),
    short_id: z
        .string()
        .describe("The short ID of the issue to resolve (e.g., PROJECT-123)"),
    format: z
        .enum(["plain", "markdown"])
        .default("markdown")
        .describe("Output format (default: markdown)"),
}, async ({ organization_slug, short_id, format, }) => {
    try {
        const data = await sentryClient.resolveShortId(organization_slug, short_id);
        let output = "";
        if (format === "markdown") {
            output = `# Issue Details: ${data.shortId}\n\n`;
            output += `## Issue Information\n\n`;
            output += `- **Title**: ${data.group.title}\n`;
            output += `- **Status**: ${data.group.status}\n`;
            output += `- **Level**: ${data.group.level}\n`;
            output += `- **Event Count**: ${data.group.count}\n`;
            output += `- **User Count**: ${data.group.userCount}\n`;
            output += `- **Permalink**: [${data.group.permalink}](${data.group.permalink})\n`;
        }
        else {
            output = `Issue Details: ${data.shortId}\n\n`;
            output += `Title: ${data.group.title}\n`;
            output += `Status: ${data.group.status}\n`;
            output += `Level: ${data.group.level}\n`;
            output += `Event Count: ${data.group.count}\n`;
            output += `User Count: ${data.group.userCount}\n`;
            output += `Permalink: ${data.group.permalink}\n`;
        }
        return {
            content: [
                {
                    type: "text",
                    text: output,
                },
            ],
        };
    }
    catch (error) {
        return ErrorHandler.handleApiError(error, "resolve_short_id");
    }
});
// Extract issue context data tool
server.tool("extract_issue_context_data", "Извлекает данные из Additional Context всех событий issue одним запросом", {
    organization_slug: z
        .string()
        .describe("The slug of the organization the issue belongs to"),
    issue_id: z
        .string()
        .describe("The ID of the issue to extract context data from"),
    extract_fields: z
        .array(z.string())
        .describe("Поля для извлечения из contexts/extra (например: ['roomId', 'userId', 'message'])"),
}, async ({ organization_slug, issue_id, extract_fields, }) => {
    try {
        const events = await sentryClient.getIssueEvents(organization_slug, issue_id, true); // full=true
        const extractedData = [];
        const uniqueValues = {};
        extract_fields.forEach((field) => {
            uniqueValues[field] = new Set();
        });
        events.forEach((event) => {
            const eventData = {
                event_id: event.id,
                timestamp: event.dateCreated,
            };
            // Extract from contexts, extra, context, and root
            const sources = [
                event.contexts,
                event.extra,
                event.context,
                event,
            ];
            extract_fields.forEach((field) => {
                for (const source of sources) {
                    if (source &&
                        source[field] !== undefined &&
                        eventData[field] === undefined) {
                        eventData[field] = source[field];
                        uniqueValues[field].add(String(source[field]));
                        break;
                    }
                }
            });
            const hasData = extract_fields.some((field) => eventData[field] !== undefined);
            if (hasData) {
                extractedData.push(eventData);
            }
        });
        const uniqueValuesResult = {};
        Object.keys(uniqueValues).forEach((field) => {
            uniqueValuesResult[field] = Array.from(uniqueValues[field]).sort();
        });
        const result = {
            extracted_data: extractedData,
            unique_values: uniqueValuesResult,
            total_events: events.length,
            events_with_data: extractedData.length,
        };
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    }
    catch (error) {
        return ErrorHandler.handleApiError(error, "extract_issue_context_data");
    }
});
server.tool("export_issue_events_to_file", "Выгружает все события issue, начиная с даты since в UTC, в локальный JSONL-файл и возвращает путь к нему.", {
    issue_id_or_url: z
        .string()
        .describe("Either a full Sentry issue URL or just the numeric issue ID"),
    organization_slug: z
        .string()
        .describe("The slug of the organization the issue belongs to"),
    since: z
        .string()
        .describe("UTC lower bound. Examples: 2026-04-15 or 2026-04-15T00:00:00Z"),
    until: z
        .string()
        .optional()
        .describe("UTC upper bound. Plain date YYYY-MM-DD means end of that day inclusive. Defaults to current UTC time when omitted."),
    output_directory: z
        .string()
        .optional()
        .describe("Optional local directory relative to the MCP server working directory"),
}, async ({ issue_id_or_url, organization_slug, since, until, output_directory, }) => {
    try {
        const exportResult = await exportIssueEventsToFile(sentryClient, {
            issueIdOrUrl: issue_id_or_url,
            organizationSlug: organization_slug,
            since,
            until,
            outputDirectory: output_directory,
        });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        issue_id: exportResult.issueContext.issueId,
                        issue_title: exportResult.issueContext.issueTitle,
                        organization_slug: exportResult.issueContext.organizationSlug,
                        project_slug: exportResult.issueContext.projectSlug,
                        since_utc: exportResult.issueContext.sinceUtc,
                        until_utc: exportResult.issueContext.untilUtc,
                        scanned_event_count: exportResult.scannedEventCount,
                        matched_event_count: exportResult.matchingEventCount,
                        exported_event_count: exportResult.processedEventCount,
                        export_path: exportResult.exportPath,
                        format: "jsonl",
                    }, null, 2),
                },
            ],
        };
    }
    catch (error) {
        return ErrorHandler.handleApiError(error, "export_issue_events_to_file");
    }
});
server.tool("extract_issue_event_fields_to_file", "Извлекает поля из всех событий issue, начиная с даты since в UTC, сохраняет результат в локальный JSONL-файл и возвращает путь к нему. Каждая запись дополнительно включает eventTitle и exceptionMessage, если они есть в event payload.", {
    issue_id_or_url: z
        .string()
        .describe("Either a full Sentry issue URL or just the numeric issue ID"),
    organization_slug: z
        .string()
        .describe("The slug of the organization the issue belongs to"),
    since: z
        .string()
        .describe("UTC lower bound. Examples: 2026-04-15 or 2026-04-15T00:00:00Z"),
    until: z
        .string()
        .optional()
        .describe("UTC upper bound. Plain date YYYY-MM-DD means end of that day inclusive. Defaults to current UTC time when omitted."),
    field_paths: z
        .array(z.string())
        .min(1)
        .describe("Field names or dot paths to extract. Example: ['requestParams', 'contexts.trace.trace_id']"),
    output_directory: z
        .string()
        .optional()
        .describe("Optional local directory relative to the MCP server working directory"),
}, async ({ issue_id_or_url, organization_slug, since, until, field_paths, output_directory, }) => {
    try {
        const exportResult = await exportIssueEventFieldsToFile(sentryClient, {
            issueIdOrUrl: issue_id_or_url,
            organizationSlug: organization_slug,
            since,
            until,
            fieldPaths: field_paths,
            outputDirectory: output_directory,
        });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        issue_id: exportResult.issueContext.issueId,
                        issue_title: exportResult.issueContext.issueTitle,
                        organization_slug: exportResult.issueContext.organizationSlug,
                        project_slug: exportResult.issueContext.projectSlug,
                        since_utc: exportResult.issueContext.sinceUtc,
                        until_utc: exportResult.issueContext.untilUtc,
                        scanned_event_count: exportResult.scannedEventCount,
                        matched_event_count: exportResult.matchingEventCount,
                        exported_event_count: exportResult.processedEventCount,
                        export_path: exportResult.exportPath,
                        format: "jsonl",
                        extracted_fields: field_paths,
                    }, null, 2),
                },
            ],
        };
    }
    catch (error) {
        return ErrorHandler.handleApiError(error, "extract_issue_event_fields_to_file");
    }
});
// Get specific Sentry event tool
server.tool("get_sentry_event", "Retrieve a specific Sentry event from an issue. Requires issue ID/URL and event ID. For URLs with events, event_id can be extracted automatically.", {
    issue_id_or_url: z
        .string()
        .describe("Either a full Sentry issue URL or just the numeric issue ID"),
    event_id: z.string().describe("The specific event ID to retrieve"),
    organization_slug: z
        .string()
        .describe("The slug of the organization the issue belongs to"),
    view: z
        .enum(["summary", "detailed"])
        .default("detailed")
        .describe("View type (default: detailed)"),
    format: z
        .enum(["plain", "markdown"])
        .default("markdown")
        .describe("Output format (default: markdown)"),
}, async ({ issue_id_or_url, event_id, view, organization_slug, format, }) => {
    try {
        // Extract issue ID from URL if provided
        let issueId = issue_id_or_url;
        let organizationSlug = organization_slug;
        let extractedEventId = event_id;
        if (issue_id_or_url.startsWith("http")) {
            try {
                const url = new URL(issue_id_or_url);
                const pathParts = url.pathname
                    .split("/")
                    .filter((part) => part);
                // URL structure: /organizations/{org}/issues/{issue_id}/events/{event_id}
                if (pathParts.length >= 2 &&
                    pathParts[0] === "organizations") {
                    organizationSlug = pathParts[1];
                    if (pathParts.length >= 4 &&
                        pathParts[2] === "issues") {
                        issueId = pathParts[3];
                    }
                    // If URL contains events and we have an event_id in URL, use it
                    if (pathParts.length >= 6 &&
                        pathParts[4] === "events") {
                        extractedEventId = pathParts[5];
                    }
                }
            }
            catch (e) {
                // If URL parsing fails, use provided values
            }
        }
        const event = await sentryClient.getIssueEvent(organizationSlug, issueId, extractedEventId);
        const formatter = new IssueFormatter({ format, view });
        // Use specialized single event formatter for better detail
        const output = formatter.formatSingleEvent(event, extractedEventId);
        return {
            content: [
                {
                    type: "text",
                    text: output,
                },
            ],
        };
    }
    catch (error) {
        return ErrorHandler.handleApiError(error, "get_sentry_event");
    }
});
async function main() {
    try {
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error("Sentry MCP Server running");
    }
    catch (error) {
        throw error;
    }
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
});
