import { paginateAll_listAnIssue_sEvents, retrieveAnEventForAProject, retrieveAnIssue, unwrapResult, } from "@sentry/api";
import { createRetryFetch } from "./sentryRetryFetch.js";
import { buildIssueEventsListQuery, DEFAULT_ISSUE_EVENTS_PAGE_SIZE, } from "../utils/eventExportDateRange.js";
const DEFAULT_MAX_EVENT_LIST_PAGES = 500;
export class SentrySdkExportClient {
    constructor(host, authToken) {
        this.requestConfig = {
            baseUrl: host.replace(/\/$/, ""),
            headers: {
                Authorization: `Bearer ${authToken}`,
            },
            fetch: createRetryFetch(),
        };
    }
    async getIssueDetails(organizationSlug, issueId) {
        const { data } = unwrapResult(await retrieveAnIssue({
            ...this.requestConfig,
            path: {
                organization_id_or_slug: organizationSlug,
                issue_id: issueId,
            },
        }), "retrieveAnIssue");
        const issueDetails = data;
        return {
            title: issueDetails.title,
            project: {
                slug: issueDetails.project?.slug ?? "",
            },
        };
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
