import { paginateAll_listAnIssue_sEvents, paginateAll_listAnOrganization_sProjects, paginateAll_listAProject_sIssues, resolveAShortId, retrieveAnEventForAProject, retrieveAnIssue, unwrapResult, } from "@sentry/api";
import { createRetryFetch } from "./sentryRetryFetch.js";
import { buildIssueEventsListQuery, DEFAULT_ISSUE_EVENTS_PAGE_SIZE, } from "../utils/eventExportDateRange.js";
const DEFAULT_MAX_LIST_PAGES = 50;
const DEFAULT_MAX_EVENT_LIST_PAGES = 500;
export class SentrySdkClient {
    constructor(host, authToken) {
        this.requestConfig = {
            baseUrl: host.replace(/\/$/, ""),
            headers: {
                Authorization: `Bearer ${authToken}`,
            },
            fetch: createRetryFetch(),
        };
    }
    async getProjects(organizationSlug) {
        const projects = await paginateAll_listAnOrganization_sProjects({
            ...this.requestConfig,
            path: {
                organization_id_or_slug: organizationSlug,
            },
        }, { maxPages: DEFAULT_MAX_LIST_PAGES });
        return projects;
    }
    async getProjectIssues(organizationSlug, projectSlug, query) {
        const issues = await paginateAll_listAProject_sIssues({
            ...this.requestConfig,
            path: {
                organization_id_or_slug: organizationSlug,
                project_id_or_slug: projectSlug,
            },
            query: query ? { query } : undefined,
        }, { maxPages: DEFAULT_MAX_LIST_PAGES });
        return issues;
    }
    async getIssue(organizationSlug, issueId) {
        const { data } = unwrapResult(await retrieveAnIssue({
            ...this.requestConfig,
            path: {
                organization_id_or_slug: organizationSlug,
                issue_id: issueId,
            },
        }), "retrieveAnIssue");
        return data;
    }
    async getIssueDetails(organizationSlug, issueId) {
        const issue = await this.getIssue(organizationSlug, issueId);
        const project = issue.project;
        return {
            title: String(issue.title ?? ""),
            project: {
                slug: project?.slug ?? "",
            },
        };
    }
    async getIssueEvents(organizationSlug, issueId, full = false) {
        const events = await paginateAll_listAnIssue_sEvents({
            ...this.requestConfig,
            path: {
                organization_id_or_slug: organizationSlug,
                issue_id: issueId,
            },
            query: full ? { full: true } : undefined,
        }, { maxPages: DEFAULT_MAX_EVENT_LIST_PAGES });
        return events;
    }
    async resolveShortId(organizationSlug, shortId) {
        const { data } = unwrapResult(await resolveAShortId({
            ...this.requestConfig,
            path: {
                organization_id_or_slug: organizationSlug,
                issue_id: shortId,
            },
        }), "resolveAShortId");
        const response = data;
        return {
            shortId: response.group.shortId ?? shortId,
            group: response.group,
        };
    }
    async getIssueEvent(organizationSlug, issueId, eventId) {
        const issue = await this.getIssue(organizationSlug, issueId);
        const project = issue.project;
        const projectSlug = project?.slug;
        if (!projectSlug) {
            throw new Error(`Unable to resolve project slug for issue ${issueId}`);
        }
        return this.getProjectEvent(organizationSlug, projectSlug, eventId);
    }
    async listIssueEventSummaries(inputValues) {
        const eventSummaries = await paginateAll_listAnIssue_sEvents({
            ...this.requestConfig,
            path: {
                organization_id_or_slug: inputValues.organizationSlug,
                issue_id: inputValues.issueId,
            },
            query: buildIssueEventsListQuery(inputValues.sinceUtc, inputValues.untilUtc),
        }, { maxPages: DEFAULT_MAX_EVENT_LIST_PAGES });
        return eventSummaries;
    }
    async getProjectEvent(organizationSlug, projectSlug, eventId) {
        const { data } = unwrapResult(await retrieveAnEventForAProject({
            ...this.requestConfig,
            path: {
                organization_id_or_slug: organizationSlug,
                project_id_or_slug: projectSlug,
                event_id: eventId,
            },
        }), "retrieveAnEventForAProject");
        return data;
    }
}
export { DEFAULT_ISSUE_EVENTS_PAGE_SIZE };
