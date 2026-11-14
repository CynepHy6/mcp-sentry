import { IssueFormatter } from "../formatters/issueFormatter.js";
import { ProjectFormatter } from "../formatters/projectFormatter.js";
import { ErrorHandler } from "../utils/errorHandler.js";
import { TOOL_SCHEMAS } from "../utils/tool-schemas.js";
export function createProjectTools(apiClient) {
    return {
        list_projects: {
            description: "List accessible Sentry projects. View project slugs, IDs, status, settings, features, and organization details.",
            schema: TOOL_SCHEMAS.list_projects,
            handler: async ({ organization_slug, view, format, }) => {
                try {
                    const projects = await apiClient.getProjects(organization_slug);
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
            },
        },
        list_project_issues: {
            description: "List issues from a Sentry project. Monitor issue status, severity, frequency, and timing. Supports search queries using Sentry's query syntax. When query is provided, filters issues by status, level, assignment, or text content in title/description. Multiple filters can be combined with spaces. Examples: 'is:unresolved level:error' finds unresolved errors, 'video.skysvc.link' searches for text in issue titles/descriptions, 'assigned:me' finds issues assigned to current user.",
            schema: TOOL_SCHEMAS.list_project_issues,
            handler: async ({ organization_slug, project_slug, query, view, format, }) => {
                try {
                    const issues = await apiClient.getProjectIssues(organization_slug, project_slug, query);
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
            },
        },
    };
}
