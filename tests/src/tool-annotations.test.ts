// Аннотации MCP: у каждого зарегистрированного инструмента есть пометка, читающие помечены readOnlyHint.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { TOOL_ANNOTATIONS, toolAnnotations } from "../../src/utils/tool-annotations.js";

const indexSource = readFileSync(join(__dirname, "../../src/index.ts"), "utf8");
const registered = [...indexSource.matchAll(/server\.tool\(\s*"([^"]+)",/g)].map(match => match[1]);
// Каждый вызов регистрации обязан начинаться с имени-литерала: иначе он выпал бы из сверки выше.
const registrations = indexSource.match(/server\.tool\(/g) ?? [];

describe("tool annotations", () => {
    it("covers every registered tool and nothing else", () => {
        expect(registered.length).toBeGreaterThan(0);
        expect(registered.length).toBe(registrations.length);
        expect([...registered].sort()).toEqual(Object.keys(TOOL_ANNOTATIONS).sort());
    });

    it("passes annotations to every registration", () => {
        const blocks = indexSource.split(/server\.tool\(/).slice(1);
        expect(blocks.length).toBe(registered.length);
        for (const block of blocks) {
            const name = /^\s*"([^"]+)",/.exec(block)?.[1];
            expect(block.split("\n);")[0]).toContain(`toolAnnotations("${name}")`);
        }
    });

    it("marks Sentry reads read-only, including extract_issue_context_data", () => {
        for (const name of [
            "list_projects",
            "list_project_issues",
            "get_sentry_issue",
            "list_issue_events",
            "resolve_short_id",
            "get_sentry_event",
            "extract_issue_context_data",
        ]) {
            expect(toolAnnotations(name).readOnlyHint).toBe(true);
        }
    });

    it("marks file exports as additive writes, nothing destructive", () => {
        for (const name of ["export_issue_events_to_file", "extract_issue_event_fields_to_file"]) {
            expect(toolAnnotations(name)).toMatchObject({ readOnlyHint: false, destructiveHint: false });
        }
        const destructive = Object.entries(TOOL_ANNOTATIONS)
            .filter(([, annotations]) => annotations.destructiveHint)
            .map(([name]) => name);
        expect(destructive).toEqual([]);
    });

    it("refuses an unknown tool", () => {
        expect(() => toolAnnotations("no_such_tool")).toThrow(/no_such_tool/);
    });
});
