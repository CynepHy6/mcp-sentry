import { BaseFormatter } from "./baseFormatter.js";
export class IssueFormatter extends BaseFormatter {
    constructor(options) {
        super(options);
    }
    formatData(data) {
        // This is a placeholder - specific methods should be used instead
        return "";
    }
    formatIssueList(issues, projectSlug) {
        if (issues.length === 0) {
            return (this.createHeader(`Issues for Project: ${projectSlug}`) +
                "No issues found for this project.\n");
        }
        if (this.isDetailed()) {
            return this.formatDetailedIssueList(issues, projectSlug);
        }
        return this.formatSummaryIssueList(issues, projectSlug);
    }
    formatIssueDetails(issue) {
        if (this.isDetailed()) {
            return this.formatDetailedIssue(issue);
        }
        return this.formatSummaryIssue(issue);
    }
    formatEventList(events, issueTitle) {
        if (events.length === 0) {
            return (this.createHeader(`Events for ${issueTitle}`) +
                "No events found for this issue.\n");
        }
        if (this.isDetailed()) {
            return this.formatDetailedEventList(events, issueTitle);
        }
        return this.formatSummaryEventList(events, issueTitle);
    }
    formatSingleEvent(event, eventId) {
        let output = this.createHeader(`Event Details: ${eventId}`);
        // Essential error information
        output += this.createHeader("Error Overview", 2);
        const basicInfo = [
            `${this.createBold("Title")}: ${event.title || event.metadata?.title || "N/A"}`,
            `${this.createBold("Platform")}: ${event.platform || "N/A"}`,
            `${this.createBold("Date")}: ${event.dateCreated}`,
            `${this.createBold("Culprit")}: ${event.culprit || "N/A"}`,
        ];
        output += this.createList(basicInfo);
        // Essential tags only (environment info)
        if (event.tags && event.tags.length > 0) {
            output += this.createHeader("Environment", 2);
            const importantTags = [
                "environment",
                "level",
                "release",
                "server_name",
                "runtime",
            ];
            const filteredTags = event.tags.filter((tag) => importantTags.includes(tag.key));
            if (filteredTags.length > 0) {
                if (this.isMarkdown()) {
                    const headers = ["Key", "Value"];
                    const rows = filteredTags.map((tag) => [
                        tag.key,
                        tag.value,
                    ]);
                    output += this.createTable(headers, rows);
                }
                else {
                    const tagList = filteredTags.map((tag) => `${tag.key}: ${tag.value}`);
                    output += this.createList(tagList);
                }
            }
        }
        // Additional Data (from context, contexts and extra fields)
        const additionalData = {};
        // Get data from context field (primary source for additional data)
        if (event.context && Object.keys(event.context).length > 0) {
            Object.assign(additionalData, event.context);
        }
        // Get data from contexts field (system contexts like OS, runtime)
        if (event.contexts && Object.keys(event.contexts).length > 0) {
            Object.assign(additionalData, event.contexts);
        }
        // Get data from extra field
        if (event.extra && Object.keys(event.extra).length > 0) {
            Object.assign(additionalData, event.extra);
        }
        // Look for additional data in stacktrace vars as fallback
        if (event.entries && event.entries.length > 0) {
            const stacktraceEntry = event.entries.find((entry) => entry.type === "stacktrace");
            if (stacktraceEntry &&
                stacktraceEntry.data &&
                stacktraceEntry.data.frames) {
                const frameWithVars = stacktraceEntry.data.frames
                    .slice()
                    .reverse()
                    .find((frame) => frame.vars && Object.keys(frame.vars).length > 0);
                if (frameWithVars && frameWithVars.vars) {
                    if (frameWithVars.vars.context) {
                        Object.assign(additionalData, frameWithVars.vars.context);
                    }
                    if (frameWithVars.vars.record &&
                        typeof frameWithVars.vars.record === "object") {
                        const record = frameWithVars.vars.record;
                        if (record.context)
                            Object.assign(additionalData, record.context);
                        if (record.extra)
                            Object.assign(additionalData, record.extra);
                    }
                }
            }
        }
        if (Object.keys(additionalData).length > 0) {
            output += this.createHeader("Additional Data", 2);
            output += "```json\n";
            output += JSON.stringify(additionalData, null, 2);
            output += "\n```\n\n";
        }
        // Stack Trace (show key frames only)
        if (event.entries && event.entries.length > 0) {
            const stacktraceEntry = event.entries.find((entry) => entry.type === "stacktrace");
            if (stacktraceEntry &&
                stacktraceEntry.data &&
                stacktraceEntry.data.frames) {
                output += this.createHeader("Stack Trace", 2);
                const frames = stacktraceEntry.data.frames;
                const appFrames = frames.filter((frame) => frame.inApp);
                const framesToShow = appFrames.length > 0
                    ? appFrames.slice(-5)
                    : frames.slice(-10);
                framesToShow.forEach((frame, index) => {
                    const frameNum = frames.indexOf(frame) + 1;
                    output += `**Frame ${frameNum}**: \`${frame.filename}:${frame.lineNo}\`\n`;
                    output += `- Function: \`${frame.function || "N/A"}\`\n`;
                    if (frame.context && frame.context.length > 0) {
                        const contextLine = frame.context.find((line) => line[0] === frame.lineNo);
                        if (contextLine) {
                            output += `- Code: \`${contextLine[1].trim()}\`\n`;
                        }
                    }
                    output += "\n";
                });
                if (appFrames.length < frames.length) {
                    output += `*Showing ${framesToShow.length} most relevant frames (${frames.length} total)*\n\n`;
                }
            }
        }
        // User Information (if available)
        if (event.user &&
            Object.keys(event.user).filter((key) => event.user[key]).length > 0) {
            output += this.createHeader("User Information", 2);
            const userDetails = [];
            if (event.user.id)
                userDetails.push(`${this.createBold("ID")}: ${event.user.id}`);
            if (event.user.email)
                userDetails.push(`${this.createBold("Email")}: ${event.user.email}`);
            if (event.user.username)
                userDetails.push(`${this.createBold("Username")}: ${event.user.username}`);
            if (event.user.ip_address)
                userDetails.push(`${this.createBold("IP Address")}: ${event.user.ip_address}`);
            if (userDetails.length > 0) {
                output += this.createList(userDetails);
            }
        }
        return output;
    }
    formatDetailedIssueList(issues, projectSlug) {
        let output = this.createHeader(`Issues for Project: ${projectSlug}`);
        if (this.isMarkdown()) {
            const headers = [
                "ID",
                "Short ID",
                "Title",
                "Status",
                "Level",
                "First Seen",
                "Last Seen",
                "Events",
                "Users",
            ];
            const rows = issues.map((issue) => [
                issue.id,
                issue.shortId,
                issue.title,
                issue.status,
                issue.level,
                issue.firstSeen,
                issue.lastSeen,
                issue.count,
                issue.userCount.toString(),
            ]);
            output += this.createTable(headers, rows);
        }
        output += this.createHeader("Issue Details", 2);
        for (let i = 0; i < issues.length; i++) {
            const issue = issues[i];
            output += this.createHeader(`Issue ${i + 1}: ${issue.title}`, 3);
            const details = [
                `${this.createBold("ID")}: ${issue.id}`,
                `${this.createBold("Short ID")}: ${issue.shortId}`,
                `${this.createBold("Status")}: ${issue.status}`,
                `${this.createBold("Level")}: ${issue.level}`,
                `${this.createBold("First Seen")}: ${issue.firstSeen}`,
                `${this.createBold("Last Seen")}: ${issue.lastSeen}`,
                `${this.createBold("Event Count")}: ${issue.count}`,
                `${this.createBold("User Count")}: ${issue.userCount}`,
                `${this.createBold("Culprit")}: ${issue.culprit}`,
                `${this.createBold("Permalink")}: ${this.createLink(issue.permalink, issue.permalink)}`,
            ];
            output += this.createList(details);
            if (issue.stats &&
                issue.stats["24h"] &&
                issue.stats["24h"].length > 0) {
                output += this.createHeader("24-Hour Event Distribution", 4);
                if (this.isMarkdown()) {
                    const headers = ["Timestamp", "Count"];
                    const rows = issue.stats["24h"].map(([timestamp, count]) => [
                        new Date(timestamp * 1000).toISOString(),
                        count.toString(),
                    ]);
                    output += this.createTable(headers, rows);
                }
                else {
                    for (const [timestamp, count] of issue.stats["24h"]) {
                        const date = new Date(timestamp * 1000);
                        output += `${date.toISOString()}: ${count}\n`;
                    }
                    output += "\n";
                }
            }
            output += this.createSeparator();
        }
        output += this.createHeader("Summary", 2);
        output += `Total Issues: ${issues.length}\n`;
        return output;
    }
    formatSummaryIssueList(issues, projectSlug) {
        let output = this.createHeader(`Issues for Project: ${projectSlug}`);
        const items = issues.map((issue) => {
            const mainInfo = `${this.createBold(issue.title)} (${issue.shortId})`;
            const details = `Status: ${issue.status}, Level: ${issue.level}, Events: ${issue.count}`;
            const timing = `First seen: ${issue.firstSeen}, Last seen: ${issue.lastSeen}`;
            return `${mainInfo}\n  - ${details}\n  - ${timing}`;
        });
        output += this.createList(items);
        output += `Total Issues: ${issues.length}`;
        return output;
    }
    formatDetailedIssue(issue) {
        let output = this.createHeader(`Issue: ${issue.title}`);
        output += this.createHeader("Overview", 2);
        const overviewDetails = [
            `${this.createBold("ID")}: ${issue.id}`,
            `${this.createBold("Short ID")}: ${issue.shortId}`,
            `${this.createBold("Status")}: ${issue.status}`,
            `${this.createBold("Level")}: ${issue.level}`,
            `${this.createBold("First Seen")}: ${issue.firstSeen}`,
            `${this.createBold("Last Seen")}: ${issue.lastSeen}`,
            `${this.createBold("Event Count")}: ${issue.count}`,
            `${this.createBold("User Count")}: ${issue.userCount}`,
            `${this.createBold("Culprit")}: ${issue.culprit}`,
            `${this.createBold("Permalink")}: ${this.createLink(issue.permalink, issue.permalink)}`,
        ];
        output += this.createList(overviewDetails);
        output += this.createHeader("Project", 2);
        const projectDetails = [
            `${this.createBold("Name")}: ${issue.project.name}`,
            `${this.createBold("ID")}: ${issue.project.id}`,
            `${this.createBold("Slug")}: ${issue.project.slug}`,
        ];
        output += this.createList(projectDetails);
        if (issue.firstRelease) {
            output += this.createHeader("First Release", 2);
            const releaseDetails = [
                `${this.createBold("Version")}: ${issue.firstRelease.version}`,
                `${this.createBold("Short Version")}: ${issue.firstRelease.shortVersion}`,
                `${this.createBold("Date Created")}: ${issue.firstRelease.dateCreated}`,
                `${this.createBold("First Event")}: ${issue.firstRelease.firstEvent}`,
                `${this.createBold("Last Event")}: ${issue.firstRelease.lastEvent}`,
            ];
            output += this.createList(releaseDetails);
            if (issue.firstRelease.projects &&
                issue.firstRelease.projects.length > 0) {
                const projects = issue.firstRelease.projects.map((p) => `${p.name} (${p.slug})`);
                output += this.createBold("Projects") + ":\n";
                output += this.createList(projects);
            }
        }
        if (issue.tags && issue.tags.length > 0) {
            output += this.createHeader("Tags", 2);
            if (this.isMarkdown()) {
                const headers = ["Key", "Value"];
                const rows = issue.tags.map((tag) => [tag.key, tag.value]);
                output += this.createTable(headers, rows);
            }
            else {
                for (const tag of issue.tags) {
                    output += `${tag.key}: ${tag.value}\n`;
                }
                output += "\n";
            }
        }
        if (issue.stats &&
            issue.stats["24h"] &&
            issue.stats["24h"].length > 0) {
            output += this.createHeader("24-Hour Event Distribution", 2);
            if (this.isMarkdown()) {
                const headers = ["Timestamp", "Count"];
                const rows = issue.stats["24h"].map(([timestamp, count]) => [
                    new Date(timestamp * 1000).toISOString(),
                    count.toString(),
                ]);
                output += this.createTable(headers, rows);
            }
            else {
                for (const [timestamp, count] of issue.stats["24h"]) {
                    const date = new Date(timestamp * 1000);
                    output += `${date.toISOString()}: ${count}\n`;
                }
                output += "\n";
            }
        }
        return output;
    }
    formatSummaryIssue(issue) {
        let output = this.createHeader(`Issue: ${issue.title}`);
        const details = [
            `${this.createBold("Short ID")}: ${issue.shortId}`,
            `${this.createBold("Status")}: ${issue.status}, ${this.createBold("Level")}: ${issue.level}`,
            `${this.createBold("First Seen")}: ${issue.firstSeen}, ${this.createBold("Last Seen")}: ${issue.lastSeen}`,
            `${this.createBold("Events")}: ${issue.count}, ${this.createBold("Users Affected")}: ${issue.userCount}`,
            `${this.createBold("Project")}: ${issue.project.name}`,
            `${this.createBold("Permalink")}: ${this.createLink(issue.permalink, issue.permalink)}`,
        ];
        output += this.createList(details);
        if (issue.stats &&
            issue.stats["24h"] &&
            issue.stats["24h"].length > 0) {
            let total24h = 0;
            for (const [_, count] of issue.stats["24h"]) {
                total24h += count;
            }
            output += `\n${this.createBold("24-Hour Event Count")}: ${total24h}\n`;
        }
        return output;
    }
    formatDetailedEventList(events, issueTitle) {
        let output = this.createHeader(`Events for ${issueTitle}`);
        if (this.isMarkdown()) {
            const headers = [
                "Event ID",
                "Title",
                "Platform",
                "Date Created",
                "Location",
            ];
            const rows = events.map((event) => [
                event.eventID || event.id,
                event.title || "N/A",
                event.platform || "N/A",
                event.dateCreated || "N/A",
                event.location || "N/A",
            ]);
            output += this.createTable(headers, rows);
        }
        output += this.createHeader("Event Details", 2);
        for (let i = 0; i < events.length; i++) {
            const event = events[i];
            output += this.createHeader(`Event ${i + 1}: ${event.title || event.eventID || event.id}`, 3);
            const details = [
                `${this.createBold("Event ID")}: ${event.eventID || event.id}`,
                `${this.createBold("Date Created")}: ${event.dateCreated}`,
                `${this.createBold("Platform")}: ${event.platform || "N/A"}`,
                `${this.createBold("Type")}: ${event["event.type"] || event.type || "N/A"}`,
                `${this.createBold("Location")}: ${event.location || "N/A"}`,
                `${this.createBold("Culprit")}: ${event.culprit || "N/A"}`,
            ];
            output += this.createList(details);
            // Add tags if available
            if (event.tags && event.tags.length > 0) {
                output += this.createHeader("Tags", 4);
                if (this.isMarkdown()) {
                    const headers = ["Key", "Value"];
                    const rows = event.tags.map((tag) => [
                        tag.key,
                        tag.value,
                    ]);
                    output += this.createTable(headers, rows);
                }
                else {
                    for (const tag of event.tags) {
                        output += `${tag.key}: ${tag.value}\n`;
                    }
                    output += "\n";
                }
            }
            // Add user information if available
            if (event.user) {
                output += this.createHeader("User Information", 4);
                const userDetails = [];
                if (event.user.id)
                    userDetails.push(`${this.createBold("ID")}: ${event.user.id}`);
                if (event.user.email)
                    userDetails.push(`${this.createBold("Email")}: ${event.user.email}`);
                if (event.user.username)
                    userDetails.push(`${this.createBold("Username")}: ${event.user.username}`);
                if (event.user.ip_address)
                    userDetails.push(`${this.createBold("IP Address")}: ${event.user.ip_address}`);
                if (userDetails.length > 0) {
                    output += this.createList(userDetails);
                }
            }
            output += this.createSeparator();
        }
        output += this.createHeader("Summary", 2);
        output += `Total Events: ${events.length}\n`;
        return output;
    }
    formatSummaryEventList(events, issueTitle) {
        let output = this.createHeader(`Events for ${issueTitle}`);
        const items = events.map((event) => {
            const level = event.tags?.find((tag) => tag.key === "level")?.value ||
                "unknown";
            const environment = event.tags?.find((tag) => tag.key === "environment")
                ?.value || "unknown";
            const mainInfo = `${this.createBold("Event ID")}: ${event.eventID || event.id}`;
            const details = `Title: ${event.title || "N/A"}`;
            const context = `Level: ${level}, Environment: ${environment}, Platform: ${event.platform || "N/A"}`;
            const timing = `Date: ${event.dateCreated}`;
            return `${mainInfo}\n  - ${details}\n  - ${context}\n  - ${timing}`;
        });
        output += this.createList(items);
        output += `Total Events: ${events.length}`;
        return output;
    }
}
