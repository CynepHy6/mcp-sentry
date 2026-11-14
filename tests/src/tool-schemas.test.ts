import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { createProjectTools } from "../../src/tools/projectTools.js";
import type { SentrySdkClient } from "../../src/api/sentrySdkClient.js";
import { TOOL_SCHEMAS } from "../../src/utils/tool-schemas.js";

const indexSource = readFileSync(join(__dirname, "../../src/index.ts"), "utf8");
const packageJson = JSON.parse(
    readFileSync(join(__dirname, "../../package.json"), "utf8"),
) as { version: string };

describe("TOOL_SCHEMAS and server registrations", () => {
    it("wires every server.tool registration in src/index.ts to TOOL_SCHEMAS", () => {
        const blocks = indexSource.split(/server\.tool\(/).slice(1);
        const registered = blocks.map(
            (block) => /^\s*"([^"]+)",/.exec(block)?.[1] ?? "",
        );

        expect(registered.length).toBeGreaterThan(0);
        expect([...registered].sort()).toEqual(
            Object.keys(TOOL_SCHEMAS).sort(),
        );

        for (const block of blocks) {
            const name = /^\s*"([^"]+)",/.exec(block)?.[1];
            expect(block.split("\n);")[0]).toContain(`TOOL_SCHEMAS.${name}`);
        }
    });

    it("keeps McpServer version in src/index.ts synchronized with package.json", () => {
        const serverVersion = /new McpServer\(\{\s*name:\s*"Sentry",\s*version:\s*"([^"]+)"/.exec(
            indexSource,
        )?.[1];
        expect(serverVersion).toBe(packageJson.version);
    });

    it("defaults view to summary for list tools and get_sentry_issue, with matching schema descriptions", () => {
        const summaryDefaultCases = [
            {
                name: "list_projects" as const,
                minimalInput: { organization_slug: "skyeng" },
            },
            {
                name: "list_project_issues" as const,
                minimalInput: {
                    organization_slug: "skyeng",
                    project_slug: "auto-schedule-front",
                },
            },
            {
                name: "list_issue_events" as const,
                minimalInput: {
                    organization_slug: "skyeng",
                    issue_id: "10233000",
                },
            },
            {
                name: "get_sentry_issue" as const,
                minimalInput: {
                    organization_slug: "skyeng",
                    issue_id_or_url: "10233000",
                },
            },
        ];

        for (const { name, minimalInput } of summaryDefaultCases) {
            const rawShape = TOOL_SCHEMAS[name];
            const parsed = z.object(rawShape).parse(minimalInput);
            expect(parsed.view).toBe("summary");
            expect(parsed.format).toBe("markdown");
            expect(rawShape.view.description).toBe(
                "View type (default: summary)",
            );
            expect(rawShape.format.description).toBe(
                "Output format (default: markdown)",
            );

            const overridden = z
                .object(rawShape)
                .parse({ ...minimalInput, view: "detailed", format: "plain" });
            expect(overridden.view).toBe("detailed");
            expect(overridden.format).toBe("plain");
        }
    });

    it("keeps view default as detailed for get_sentry_event so single-event diagnostics are intact", () => {
        const schema = z.object(TOOL_SCHEMAS.get_sentry_event);
        const parsed = schema.parse({
            organization_slug: "skyeng",
            issue_id_or_url: "10233000",
            event_id: "evt-1",
        });

        expect(parsed.view).toBe("detailed");
        expect(parsed.format).toBe("markdown");
        expect(TOOL_SCHEMAS.get_sentry_event.view.description).toBe(
            "View type (default: detailed)",
        );

        const summaryExplicit = schema.parse({
            organization_slug: "skyeng",
            issue_id_or_url: "10233000",
            event_id: "evt-1",
            view: "summary",
        });
        expect(summaryExplicit.view).toBe("summary");
    });

    it("rejects invalid enum values and empty field_paths", () => {
        expect(
            z
                .object(TOOL_SCHEMAS.list_projects)
                .safeParse({ organization_slug: "skyeng", view: "compact" })
                .success,
        ).toBe(false);
        expect(
            z
                .object(TOOL_SCHEMAS.list_projects)
                .safeParse({ organization_slug: "skyeng", format: "json" })
                .success,
        ).toBe(false);
        expect(
            z
                .object(TOOL_SCHEMAS.extract_issue_event_fields_to_file)
                .safeParse({
                    organization_slug: "skyeng",
                    issue_id_or_url: "10233000",
                    since: "2026-05-01",
                    field_paths: [],
                }).success,
        ).toBe(false);
    });

    it("shares TOOL_SCHEMAS with createProjectTools", () => {
        const tools = createProjectTools({} as SentrySdkClient);
        expect(tools.list_projects.schema).toBe(TOOL_SCHEMAS.list_projects);
        expect(tools.list_project_issues.schema).toBe(
            TOOL_SCHEMAS.list_project_issues,
        );
    });
});
