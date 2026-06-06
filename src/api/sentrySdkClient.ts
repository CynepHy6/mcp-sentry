import {
    paginateAll_listAnIssue_sEvents,
    paginateAll_listAnOrganization_sProjects,
    paginateAll_listAProject_sIssues,
    resolveAShortId,
    retrieveAnEventForAProject,
    retrieveAnIssue,
    unwrapResult,
} from "@sentry/api";
import { createRetryFetch } from "./sentryRetryFetch.js";
import {
    buildIssueEventsListQuery,
    DEFAULT_ISSUE_EVENTS_PAGE_SIZE,
} from "../utils/eventExportDateRange.js";
import type {
    SentryIssueDetailsResponse,
    SentryProject,
    SentryProjectIssue,
} from "../types.js";

const DEFAULT_MAX_LIST_PAGES = 50;
const DEFAULT_MAX_EVENT_LIST_PAGES = 500;

type JsonRecord = Record<string, unknown>;

interface SdkRequestConfig {
    baseUrl: string;
    headers: {
        Authorization: string;
    };
    fetch: typeof fetch;
}

export interface IssueDetailsSummary {
    title: string;
    project: {
        slug: string;
    };
}

export interface ResolvedShortId {
    shortId: string;
    group: {
        title: string;
        status: string;
        level: string;
        count?: string;
        userCount?: number;
        permalink: string;
    };
}

export class SentrySdkClient {
    private readonly requestConfig: SdkRequestConfig;

    constructor(host: string, authToken: string) {
        this.requestConfig = {
            baseUrl: host.replace(/\/$/, ""),
            headers: {
                Authorization: `Bearer ${authToken}`,
            },
            fetch: createRetryFetch(),
        };
    }

    async getProjects(organizationSlug: string): Promise<SentryProject[]> {
        const projects = await paginateAll_listAnOrganization_sProjects(
            {
                ...this.requestConfig,
                path: {
                    organization_id_or_slug: organizationSlug,
                },
            },
            { maxPages: DEFAULT_MAX_LIST_PAGES },
        );

        return projects as SentryProject[];
    }

    async getProjectIssues(
        organizationSlug: string,
        projectSlug: string,
        query?: string,
    ): Promise<SentryProjectIssue[]> {
        const issues = await paginateAll_listAProject_sIssues(
            {
                ...this.requestConfig,
                path: {
                    organization_id_or_slug: organizationSlug,
                    project_id_or_slug: projectSlug,
                },
                query: query ? { query } : undefined,
            },
            { maxPages: DEFAULT_MAX_LIST_PAGES },
        );

        return issues as SentryProjectIssue[];
    }

    async getIssue(
        organizationSlug: string,
        issueId: string,
    ): Promise<SentryIssueDetailsResponse> {
        const { data } = unwrapResult(
            await retrieveAnIssue({
                ...this.requestConfig,
                path: {
                    organization_id_or_slug: organizationSlug,
                    issue_id: issueId,
                },
            }),
            "retrieveAnIssue",
        );

        return data as SentryIssueDetailsResponse;
    }

    async getIssueDetails(
        organizationSlug: string,
        issueId: string,
    ): Promise<IssueDetailsSummary> {
        const issue = await this.getIssue(organizationSlug, issueId);
        const project = issue.project as { slug?: string } | undefined;

        return {
            title: String(issue.title ?? ""),
            project: {
                slug: project?.slug ?? "",
            },
        };
    }

    async getIssueEvents(
        organizationSlug: string,
        issueId: string,
        full: boolean = false,
    ): Promise<JsonRecord[]> {
        const events = await paginateAll_listAnIssue_sEvents(
            {
                ...this.requestConfig,
                path: {
                    organization_id_or_slug: organizationSlug,
                    issue_id: issueId,
                },
                query: full ? { full: true } : undefined,
            },
            { maxPages: DEFAULT_MAX_EVENT_LIST_PAGES },
        );

        return events as JsonRecord[];
    }

    async resolveShortId(
        organizationSlug: string,
        shortId: string,
    ): Promise<ResolvedShortId> {
        const { data } = unwrapResult(
            await resolveAShortId({
                ...this.requestConfig,
                path: {
                    organization_id_or_slug: organizationSlug,
                    issue_id: shortId,
                },
            }),
            "resolveAShortId",
        );

        const response = data as ResolvedShortId & {
            group: ResolvedShortId["group"] & { shortId?: string };
        };

        return {
            shortId: response.group.shortId ?? shortId,
            group: response.group,
        };
    }

    async getIssueEvent(
        organizationSlug: string,
        issueId: string,
        eventId: string,
    ): Promise<JsonRecord> {
        const issue = await this.getIssue(organizationSlug, issueId);
        const project = issue.project as { slug?: string } | undefined;
        const projectSlug = project?.slug;

        if (!projectSlug) {
            throw new Error(
                `Unable to resolve project slug for issue ${issueId}`,
            );
        }

        return this.getProjectEvent(organizationSlug, projectSlug, eventId);
    }

    async listIssueEventSummaries(inputValues: {
        organizationSlug: string;
        issueId: string;
        sinceUtc: string;
        untilUtc?: string;
    }): Promise<JsonRecord[]> {
        const eventSummaries = await paginateAll_listAnIssue_sEvents(
            {
                ...this.requestConfig,
                path: {
                    organization_id_or_slug: inputValues.organizationSlug,
                    issue_id: inputValues.issueId,
                },
                query: buildIssueEventsListQuery(
                    inputValues.sinceUtc,
                    inputValues.untilUtc,
                ),
            },
            { maxPages: DEFAULT_MAX_EVENT_LIST_PAGES },
        );

        return eventSummaries as JsonRecord[];
    }

    async getProjectEvent(
        organizationSlug: string,
        projectSlug: string,
        eventId: string,
    ): Promise<JsonRecord> {
        const { data } = unwrapResult(
            await retrieveAnEventForAProject({
                ...this.requestConfig,
                path: {
                    organization_id_or_slug: organizationSlug,
                    project_id_or_slug: projectSlug,
                    event_id: eventId,
                },
            }),
            "retrieveAnEventForAProject",
        );

        return data as JsonRecord;
    }
}

export { DEFAULT_ISSUE_EVENTS_PAGE_SIZE };
