import { z } from "zod";
import type { FormatType, ViewType } from "../formatters/baseFormatter.js";

/**
 * Схема параметра `view`: дефолт и текст `.describe(...)` задаются из одного аргумента,
 * чтобы описание схемы для модели не расходилось с фактическим значением по умолчанию.
 */
export function createViewSchema(defaultView: ViewType) {
    return z
        .enum(["summary", "detailed"])
        .default(defaultView)
        .describe(`View type (default: ${defaultView})`);
}

export function createFormatSchema(defaultFormat: FormatType = "markdown") {
    return z
        .enum(["plain", "markdown"])
        .default(defaultFormat)
        .describe(`Output format (default: ${defaultFormat})`);
}

const PROJECT_ISSUES_QUERY_DESCRIPTION =
    "Optional search query to filter issues. Supports Sentry query syntax:\n" +
    "- Status filters: 'is:unresolved', 'is:resolved', 'is:ignored'\n" +
    "- Level filters: 'level:error', 'level:fatal', 'level:warning', 'level:info'\n" +
    "- Assignment: 'assigned:me', 'assigned:username'\n" +
    "- Text search: any text string searches in issue titles and descriptions (e.g., 'video.skysvc.link', '404', 'timeout')\n" +
    "- Combine filters: use spaces to combine multiple filters (e.g., 'is:unresolved level:error video')\n" +
    "Examples: 'is:unresolved level:error' (unresolved errors), 'video.skysvc.link' (text search), 'assigned:me' (my issues), 'is:unresolved level:error 404' (unresolved errors containing '404').";

export const TOOL_SCHEMAS = {
    list_projects: {
        organization_slug: z
            .string()
            .describe("The slug of the organization to list projects from"),
        view: createViewSchema("summary"),
        format: createFormatSchema(),
    },
    list_project_issues: {
        organization_slug: z
            .string()
            .describe("The slug of the organization the project belongs to"),
        project_slug: z
            .string()
            .describe("The slug of the project to list issues from"),
        query: z
            .string()
            .optional()
            .describe(PROJECT_ISSUES_QUERY_DESCRIPTION),
        view: createViewSchema("summary"),
        format: createFormatSchema(),
    },
    get_sentry_issue: {
        issue_id_or_url: z
            .string()
            .describe(
                "Either a full Sentry issue URL or just the numeric issue ID",
            ),
        organization_slug: z
            .string()
            .describe("The slug of the organization the issue belongs to"),
        view: createViewSchema("summary"),
        format: createFormatSchema(),
    },
    list_issue_events: {
        organization_slug: z
            .string()
            .describe("The slug of the organization the issue belongs to"),
        issue_id: z.string().describe("The ID of the issue to list events for"),
        view: createViewSchema("summary"),
        format: createFormatSchema(),
    },
    resolve_short_id: {
        organization_slug: z
            .string()
            .describe("The slug of the organization the issue belongs to"),
        short_id: z
            .string()
            .describe(
                "The short ID of the issue to resolve (e.g., PROJECT-123)",
            ),
        format: createFormatSchema(),
    },
    extract_issue_context_data: {
        organization_slug: z
            .string()
            .describe("The slug of the organization the issue belongs to"),
        issue_id: z
            .string()
            .describe("The ID of the issue to extract context data from"),
        extract_fields: z
            .array(z.string())
            .describe(
                "Поля для извлечения из contexts/extra (например: ['roomId', 'userId', 'message'])",
            ),
    },
    export_issue_events_to_file: {
        issue_id_or_url: z
            .string()
            .describe(
                "Either a full Sentry issue URL or just the numeric issue ID",
            ),
        organization_slug: z
            .string()
            .describe("The slug of the organization the issue belongs to"),
        since: z
            .string()
            .describe(
                "UTC lower bound. Examples: 2026-04-15 or 2026-04-15T00:00:00Z",
            ),
        until: z
            .string()
            .optional()
            .describe(
                "UTC upper bound. Plain date YYYY-MM-DD means end of that day inclusive. Defaults to current UTC time when omitted.",
            ),
        output_directory: z
            .string()
            .optional()
            .describe(
                "Optional local directory relative to the MCP server working directory",
            ),
    },
    extract_issue_event_fields_to_file: {
        issue_id_or_url: z
            .string()
            .describe(
                "Either a full Sentry issue URL or just the numeric issue ID",
            ),
        organization_slug: z
            .string()
            .describe("The slug of the organization the issue belongs to"),
        since: z
            .string()
            .describe(
                "UTC lower bound. Examples: 2026-04-15 or 2026-04-15T00:00:00Z",
            ),
        until: z
            .string()
            .optional()
            .describe(
                "UTC upper bound. Plain date YYYY-MM-DD means end of that day inclusive. Defaults to current UTC time when omitted.",
            ),
        field_paths: z
            .array(z.string())
            .min(1)
            .describe(
                "Field names or dot paths to extract. Example: ['requestParams', 'contexts.trace.trace_id']",
            ),
        output_directory: z
            .string()
            .optional()
            .describe(
                "Optional local directory relative to the MCP server working directory",
            ),
    },
    // Одиночное событие запрашивают ради стектрейса и контекста ошибки — дефолт остаётся detailed.
    get_sentry_event: {
        issue_id_or_url: z
            .string()
            .describe(
                "Either a full Sentry issue URL or just the numeric issue ID",
            ),
        event_id: z.string().describe("The specific event ID to retrieve"),
        organization_slug: z
            .string()
            .describe("The slug of the organization the issue belongs to"),
        view: createViewSchema("detailed"),
        format: createFormatSchema(),
    },
};
