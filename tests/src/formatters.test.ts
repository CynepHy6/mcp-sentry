import { IssueFormatter } from "../../src/formatters/issueFormatter.js";
import { ProjectFormatter } from "../../src/formatters/projectFormatter.js";
import type {
    SentryIssueDetailsResponse,
    SentryProject,
    SentryProjectIssue,
} from "../../src/types.js";

function makeProject(overrides: Partial<SentryProject> = {}): SentryProject {
    return {
        id: "42",
        name: "Auto Schedule Front",
        slug: "auto-schedule-front",
        platform: "javascript-angular",
        teams: [
            {
                id: "1",
                name: "Teaching Experience",
                slug: "te",
                dateCreated: "2025-01-01T00:00:00Z",
                isMember: true,
                teamRole: "contributor",
                flags: { "idp:provisioned": false },
                access: [],
                hasAccess: true,
                isPending: false,
                memberCount: 10,
                avatar: { avatarType: "letter_avatar", avatarUuid: null },
                orgRole: null,
            },
        ],
        environments: ["prod", "testing"],
        features: ["releases", "performance-view", "issue-stream"],
        ...overrides,
    };
}

function makeProjectIssue(
    overrides: Partial<SentryProjectIssue> = {},
): SentryProjectIssue {
    const hourly: [number, number][] = Array.from({ length: 24 }, (_, hour) => [
        1763078400 + hour * 3600,
        hour === 23 ? 5 : 0,
    ]);
    return {
        annotations: [],
        assignedTo: null,
        count: "16",
        culprit: "TasGroupSelectedScheduleComponent",
        firstSeen: "2026-05-25T10:00:00Z",
        hasSeen: true,
        id: "10233000",
        isBookmarked: false,
        isPublic: false,
        isSubscribed: true,
        lastSeen: "2026-05-28T12:00:00Z",
        level: "error",
        logger: null,
        metadata: { title: "TypeError: Cannot read properties of undefined" },
        numComments: 0,
        permalink:
            "https://sentry.example.com/organizations/skyeng/issues/10233000/",
        project: {
            id: "76",
            name: "Auto Schedule Front",
            slug: "auto-schedule-front",
        },
        shareId: null,
        shortId: "AUTO-SCHEDULE-FRONT-42",
        stats: { "24h": hourly },
        status: "unresolved",
        statusDetails: {},
        subscriptionDetails: null,
        title: "TypeError: Cannot read properties of undefined",
        type: "error",
        userCount: 3,
        ...overrides,
    };
}

function makeIssueDetails(
    overrides: Partial<SentryIssueDetailsResponse> = {},
): SentryIssueDetailsResponse {
    const hourly: [number, number][] = Array.from({ length: 24 }, (_, hour) => [
        1763078400 + hour * 3600,
        hour >= 22 ? 4 : 0,
    ]);
    return {
        activity: [],
        annotations: [],
        assignedTo: null,
        count: "16",
        culprit: "TasGroupSelectedScheduleComponent",
        firstRelease: {
            authors: [],
            commitCount: 3,
            data: {},
            dateCreated: "2026-05-24T09:00:00Z",
            dateReleased: "2026-05-24T09:30:00Z",
            deployCount: 1,
            firstEvent: "2026-05-25T10:00:00Z",
            lastCommit: null,
            lastDeploy: null,
            lastEvent: "2026-05-28T12:00:00Z",
            newGroups: 1,
            owner: null,
            projects: [
                { name: "Auto Schedule Front", slug: "auto-schedule-front" },
                { name: "Student Cabinet", slug: "student-cabinet" },
            ],
            ref: null,
            shortVersion: "1.24.0",
            url: null,
            version: "auto-schedule-front@1.24.0",
        },
        firstSeen: "2026-05-25T10:00:00Z",
        hasSeen: true,
        id: "10233000",
        isBookmarked: false,
        isPublic: false,
        isSubscribed: true,
        lastRelease: null,
        lastSeen: "2026-05-28T12:00:00Z",
        level: "error",
        logger: null,
        metadata: { title: "TypeError: Cannot read properties of undefined" },
        numComments: 0,
        participants: [],
        permalink:
            "https://sentry.example.com/organizations/skyeng/issues/10233000/",
        pluginActions: [],
        pluginContexts: [],
        pluginIssues: [],
        project: {
            id: "76",
            name: "Auto Schedule Front",
            slug: "auto-schedule-front",
        },
        seenBy: [],
        shareId: null,
        shortId: "AUTO-SCHEDULE-FRONT-42",
        stats: {
            "24h": hourly,
            "30d": [],
        },
        status: "unresolved",
        statusDetails: {},
        subscriptionDetails: null,
        tags: [
            { key: "environment", value: "prod" },
            { key: "level", value: "error" },
        ],
        title: "TypeError: Cannot read properties of undefined",
        type: "error",
        userCount: 3,
        userReportCount: 0,
        ...overrides,
    };
}

describe("ProjectFormatter", () => {
    it("formats summary much shorter than detailed while preserving name, slug, and ID", () => {
        const projects = [makeProject()];
        const summary = new ProjectFormatter({
            format: "markdown",
            view: "summary",
        }).formatData(projects);
        const detailed = new ProjectFormatter({
            format: "markdown",
            view: "detailed",
        }).formatData(projects);

        expect(summary).toContain("**Auto Schedule Front** (auto-schedule-front): ID 42");
        expect(summary).toContain("Total Projects: 1");
        expect(summary).not.toContain("performance-view");
        expect(summary).not.toContain("Teaching Experience");

        expect(detailed).toContain("| ID | Name | Slug | Platform | Teams | Environments | Features |");
        expect(detailed).toContain("performance-view");
        expect(detailed).toContain("Teaching Experience");
        expect(summary.length).toBeLessThan(detailed.length);
    });

    it("handles empty project list and missing optional fields without crashing", () => {
        const emptySummary = new ProjectFormatter({
            format: "markdown",
            view: "summary",
        }).formatData([]);
        expect(emptySummary).toContain("No projects found.");

        const sparseProject = makeProject({
            platform: undefined,
            teams: undefined as unknown as SentryProject["teams"],
            environments: undefined,
            features: [],
        });

        const detailedMarkdown = new ProjectFormatter({
            format: "markdown",
            view: "detailed",
        }).formatData([sparseProject]);
        expect(detailedMarkdown).toContain("| 42 | Auto Schedule Front | auto-schedule-front | N/A | None | None | None |");

        const detailedPlain = new ProjectFormatter({
            format: "plain",
            view: "detailed",
        }).formatData([sparseProject]);
        expect(detailedPlain).toContain("Platform: N/A");
        expect(detailedPlain).toContain("Teams: None");
        expect(detailedPlain).toContain("Environments: None");
        expect(detailedPlain).toContain("Features: None");
    });
});

describe("IssueFormatter", () => {
    it("formats issue list summary without 24h hourly tables while keeping numeric issue ID", () => {
        const issues = [makeProjectIssue()];
        const summary = new IssueFormatter({
            format: "markdown",
            view: "summary",
        }).formatIssueList(issues, "auto-schedule-front");
        const detailed = new IssueFormatter({
            format: "markdown",
            view: "detailed",
        }).formatIssueList(issues, "auto-schedule-front");

        expect(summary).toContain("AUTO-SCHEDULE-FRONT-42");
        expect(summary).toContain("ID: 10233000");
        expect(summary).toContain("Status: unresolved, Level: error, Events: 16, Users: 3");
        expect(summary).not.toContain("24-Hour Event Distribution");

        expect(detailed).toContain("24-Hour Event Distribution");
        expect(detailed).toContain("TasGroupSelectedScheduleComponent");
        expect(summary.length).toBeLessThan(detailed.length / 2);
    });

    it("formats single issue summary with aggregated 24h count and triage fields instead of 24-row table", () => {
        const issue = makeIssueDetails();
        const summary = new IssueFormatter({
            format: "markdown",
            view: "summary",
        }).formatIssueDetails(issue);
        const detailed = new IssueFormatter({
            format: "markdown",
            view: "detailed",
        }).formatIssueDetails(issue);

        expect(summary).toContain("**ID**: 10233000");
        expect(summary).toContain("**Short ID**: AUTO-SCHEDULE-FRONT-42");
        expect(summary).toContain("**Culprit**: TasGroupSelectedScheduleComponent");
        expect(summary).toContain("**Project**: Auto Schedule Front (auto-schedule-front)");
        expect(summary).toContain("**First Release**: 1.24.0");
        expect(summary).toContain("**24-Hour Event Count**: 8");
        expect(summary).not.toContain("24-Hour Event Distribution");
        expect(summary).not.toContain("Student Cabinet");

        expect(detailed).toContain("24-Hour Event Distribution");
        expect(detailed).toContain("Student Cabinet (student-cabinet)");
        expect(summary.length).toBeLessThan(detailed.length / 2);
    });

    it("handles empty lists and sparse issue/tag payloads cleanly in markdown and plain formats", () => {
        const plainSummary = new IssueFormatter({
            format: "plain",
            view: "summary",
        });
        expect(plainSummary.formatIssueList([], "math")).toBe(
            "Issues for Project: math\n\nNo issues found for this project.\n",
        );
        expect(plainSummary.formatEventList([], "Issue 1")).toBe(
            "Events for Issue 1\n\nNo events found for this issue.\n",
        );

        const sparseIssue = makeIssueDetails({
            title: "RuntimeError: Connection reset",
            culprit: "",
            firstRelease: null,
            project: { id: "10", name: "math", slug: "math" },
            stats: { "24h": [], "30d": [] },
            tags: [
                {
                    key: "environment",
                    value: undefined as unknown as string,
                    totalValues: 4,
                } as unknown as SentryIssueDetailsResponse["tags"][number],
            ],
        });

        const summaryText = plainSummary.formatIssueDetails(sparseIssue);
        expect(summaryText).toContain("Culprit: N/A");
        expect(summaryText).toContain("Project: math");
        expect(summaryText).not.toContain("math (math)");
        expect(summaryText).not.toContain("First Release");
        expect(summaryText).not.toContain("24-Hour Event Count");
        expect(summaryText).not.toContain("undefined");

        const detailedPlain = new IssueFormatter({
            format: "plain",
            view: "detailed",
        }).formatIssueDetails(sparseIssue);
        expect(detailedPlain).toContain("environment: 4 values");
        expect(detailedPlain).not.toContain("undefined");
    });

    it("formats event list summary vs detailed and handles fallback event fields", () => {
        const events = [
            {
                id: "evt-fallback-id",
                title: "Unhandled rejection",
                platform: "node",
                dateCreated: "2026-11-14T07:00:00Z",
                tags: [
                    { key: "level", value: "fatal" },
                    { key: "environment", value: "production" },
                ],
                user: { id: "u-1", email: "dev@example.com" },
            },
            {
                eventID: "evt-minimal",
            },
        ];

        const summary = new IssueFormatter({
            format: "markdown",
            view: "summary",
        }).formatEventList(events, "Issue 10233000");
        const detailed = new IssueFormatter({
            format: "markdown",
            view: "detailed",
        }).formatEventList(events, "Issue 10233000");

        expect(summary).toContain("**Event ID**: evt-fallback-id");
        expect(summary).toContain("Level: fatal, Environment: production, Platform: node");
        expect(summary).toContain("**Event ID**: evt-minimal");
        expect(summary).toContain("Level: unknown, Environment: unknown, Platform: N/A");
        expect(summary).not.toContain("dev@example.com");

        expect(detailed).toContain("User Information");
        expect(detailed).toContain("dev@example.com");
        expect(detailed).toContain("Total Events: 2");
        expect(summary.length).toBeLessThan(detailed.length);
    });

    it("preserves stack trace, filtered environment tags, and fallback context in formatSingleEvent", () => {
        const event = {
            id: "evt-single",
            title: "Error: Boom",
            platform: "php",
            dateCreated: "2026-11-14T07:00:00Z",
            culprit: "App\\Service\\RoomService",
            tags: [
                { key: "environment", value: "prod" },
                { key: "release", value: "2026.11.14" },
                { key: "browser", value: "Chrome" },
            ],
            entries: [
                {
                    type: "stacktrace",
                    data: {
                        frames: [
                            {
                                filename: "vendor/lib.php",
                                lineNo: 10,
                                function: "boot",
                                inApp: false,
                            },
                            {
                                filename: "src/Service/RoomService.php",
                                lineNo: 42,
                                function: "openRoom",
                                inApp: true,
                                context: [
                                    [41, "    public function openRoom(): void {"],
                                    [42, "        throw new RuntimeException('Boom');"],
                                ],
                                vars: {
                                    record: {
                                        context: { roomId: "room-99" },
                                    },
                                },
                            },
                        ],
                    },
                },
            ],
            user: { id: "777", username: "student_777" },
        };

        const output = new IssueFormatter({
            format: "markdown",
            view: "detailed",
        }).formatSingleEvent(event, "evt-single");

        expect(output).toContain("# Event Details: evt-single");
        expect(output).toContain("environment");
        expect(output).toContain("2026.11.14");
        expect(output).not.toContain("Chrome");
        expect(output).toContain('"roomId": "room-99"');
        expect(output).toContain("## Stack Trace");
        expect(output).toContain("`src/Service/RoomService.php:42`");
        expect(output).toContain("throw new RuntimeException('Boom');");
        expect(output).toContain("*Showing 1 most relevant frames (2 total)*");
        expect(output).toContain("student_777");

        const summary = new IssueFormatter({
            format: "markdown",
            view: "summary",
        }).formatSingleEvent(event, "evt-single");

        expect(summary).toContain("# Event Details: evt-single");
        expect(summary).toContain("**Title**: Error: Boom");
        expect(summary).toContain("**Environment**: prod");
        expect(summary).toContain("**Release**: 2026.11.14");
        expect(summary).toContain(
            "**Top Frame**: `src/Service/RoomService.php:42` in `openRoom`",
        );
        expect(summary).not.toContain("## Additional Data");
        expect(summary).not.toContain('"roomId": "room-99"');
        expect(summary).not.toContain("## Stack Trace");
        expect(summary).not.toContain("## User Information");
        expect(summary).not.toContain("student_777");
        expect(summary.length).toBeLessThan(output.length / 2);

        const minimalSummaryPlain = new IssueFormatter({
            format: "plain",
            view: "summary",
        }).formatSingleEvent(
            {
                metadata: { title: "Fallback metadata title" },
                entries: [
                    {
                        type: "exception",
                        data: {
                            values: [
                                {
                                    stacktrace: {
                                        frames: [
                                            {
                                                filename: "app/index.ts",
                                                lineNo: 17,
                                                function: "bootstrap",
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
            "evt-exception",
        );

        expect(minimalSummaryPlain).toContain("Title: Fallback metadata title");
        expect(minimalSummaryPlain).toContain(
            "Top Frame: app/index.ts:17 in bootstrap",
        );
        expect(minimalSummaryPlain).not.toContain("undefined");

        const detailedPlain = new IssueFormatter({
            format: "plain",
            view: "detailed",
        }).formatSingleEvent(event, "evt-single");
        expect(detailedPlain).toContain("environment: prod");
        expect(detailedPlain).toContain("release: 2026.11.14");
        expect(detailedPlain).not.toContain("undefined");

        const bareSummary = new IssueFormatter({
            format: "plain",
            view: "summary",
        }).formatSingleEvent({}, "evt-bare");
        const bareDetailed = new IssueFormatter({
            format: "plain",
            view: "detailed",
        }).formatSingleEvent({}, "evt-bare");
        expect(bareSummary).toContain("Title: N/A");
        expect(bareSummary).not.toContain("undefined");
        expect(bareDetailed).toContain("Title: N/A");
        expect(bareDetailed).not.toContain("undefined");
    });
});
