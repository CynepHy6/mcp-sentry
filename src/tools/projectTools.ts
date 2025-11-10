import { z } from "zod";
import { SentryProject } from "../../types";
import { SentryApiClient } from "../api/sentryClient";
import { IssueFormatter } from "../formatters/issueFormatter";
import { ProjectFormatter } from "../formatters/projectFormatter";
import { ErrorHandler } from "../utils/errorHandler";

export function createProjectTools(apiClient: SentryApiClient) {
    return {
        list_projects: {
            description:
                "List accessible Sentry projects. View project slugs, IDs, status, settings, features, and organization details.",
            schema: {
                organization_slug: z
                    .string()
                    .describe(
                        "The slug of the organization to list projects from"
                    ),
                view: z
                    .enum(["summary", "detailed"])
                    .default("detailed")
                    .describe("View type (default: detailed)"),
                format: z
                    .enum(["plain", "markdown"])
                    .default("markdown")
                    .describe("Output format (default: markdown)"),
            },
            handler: async ({
                organization_slug,
                view,
                format,
            }: {
                organization_slug: string;
                view: "summary" | "detailed";
                format: "plain" | "markdown";
            }) => {
                try {
                    const projects: SentryProject[] =
                        await apiClient.getProjects(organization_slug);

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
                } catch (error) {
                    return ErrorHandler.handleApiError(
                        error as Error,
                        "list_projects"
                    );
                }
            },
        },

        list_project_issues: {
            description:
                "List issues from a Sentry project. Monitor issue status, severity, frequency, and timing. Supports search queries using Sentry's query syntax. When query is provided, filters issues by status, level, assignment, or text content in title/description. Multiple filters can be combined with spaces. Examples: 'is:unresolved level:error' finds unresolved errors, 'video.skysvc.link' searches for text in issue titles/descriptions, 'assigned:me' finds issues assigned to current user.",
            schema: {
                organization_slug: z
                    .string()
                    .describe(
                        "The slug of the organization the project belongs to"
                    ),
                project_slug: z
                    .string()
                    .describe("The slug of the project to list issues from"),
                query: z
                    .string()
                    .optional()
                    .describe(
                        "Optional search query to filter issues. Supports Sentry query syntax:\n" +
                        "- Status filters: 'is:unresolved', 'is:resolved', 'is:ignored'\n" +
                        "- Level filters: 'level:error', 'level:fatal', 'level:warning', 'level:info'\n" +
                        "- Assignment: 'assigned:me', 'assigned:username'\n" +
                        "- Text search: any text string searches in issue titles and descriptions (e.g., 'video.skysvc.link', '404', 'timeout')\n" +
                        "- Combine filters: use spaces to combine multiple filters (e.g., 'is:unresolved level:error video')\n" +
                        "Examples: 'is:unresolved level:error' (unresolved errors), 'video.skysvc.link' (text search), 'assigned:me' (my issues), 'is:unresolved level:error 404' (unresolved errors containing '404')."
                    ),
                view: z
                    .enum(["summary", "detailed"])
                    .default("detailed")
                    .describe("View type (default: detailed)"),
                format: z
                    .enum(["plain", "markdown"])
                    .default("markdown")
                    .describe("Output format (default: markdown)"),
            },
            handler: async ({
                organization_slug,
                project_slug,
                query,
                view,
                format,
            }: {
                organization_slug: string;
                project_slug: string;
                query?: string;
                view: "summary" | "detailed";
                format: "plain" | "markdown";
            }) => {
                try {
                    const issues = await apiClient.getProjectIssues(
                        organization_slug,
                        project_slug,
                        query
                    );

                    const formatter = new IssueFormatter({ format, view });
                    const output = formatter.formatIssueList(
                        issues,
                        project_slug
                    );

                    return {
                        content: [
                            {
                                type: "text",
                                text: output,
                            },
                        ],
                    };
                } catch (error) {
                    return ErrorHandler.handleApiError(
                        error as Error,
                        "list_project_issues"
                    );
                }
            },
        },
    };
}
