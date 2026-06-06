import fetch, { RequestInit, Response } from "node-fetch";

const DEFAULT_MAX_RETRY_ATTEMPTS = 8;
const DEFAULT_INITIAL_RETRY_DELAY_MS = 1000;
const DEFAULT_MAX_RETRY_DELAY_MS = 30_000;

export function isRetryableSentryStatus(status: number): boolean {
    return status === 429 || status === 502 || status === 503 || status === 504;
}

export function parseRetryAfterMs(
    retryAfterHeader: string | null
): number | null {
    if (!retryAfterHeader) {
        return null;
    }

    const retryAfterSeconds = Number(retryAfterHeader);
    if (!Number.isNaN(retryAfterSeconds)) {
        return Math.max(0, retryAfterSeconds * 1000);
    }

    const retryAfterDate = Date.parse(retryAfterHeader);
    if (!Number.isNaN(retryAfterDate)) {
        return Math.max(0, retryAfterDate - Date.now());
    }

    return null;
}

export function parseRateLimitResetMs(
    resetHeader: string | null
): number | null {
    if (!resetHeader) {
        return null;
    }

    const resetUnixSeconds = Number(resetHeader);
    if (Number.isNaN(resetUnixSeconds)) {
        return null;
    }

    return Math.max(0, resetUnixSeconds * 1000 - Date.now());
}

export function computeRetryDelayMs(
    attemptIndex: number,
    response: { headers: { get(name: string): string | null } }
): number {
    const retryAfterDelay = parseRetryAfterMs(
        response.headers.get("Retry-After")
    );
    if (retryAfterDelay !== null) {
        return Math.min(retryAfterDelay, DEFAULT_MAX_RETRY_DELAY_MS);
    }

    const resetDelay = parseRateLimitResetMs(
        response.headers.get("X-Sentry-Rate-Limit-Reset")
    );
    if (resetDelay !== null && resetDelay > 0) {
        return Math.min(resetDelay, DEFAULT_MAX_RETRY_DELAY_MS);
    }

    const exponentialDelay =
        DEFAULT_INITIAL_RETRY_DELAY_MS * 2 ** attemptIndex;
    return Math.min(exponentialDelay, DEFAULT_MAX_RETRY_DELAY_MS);
}

export class SentryApiClient {
    private baseUrl: string;
    private authToken: string;

    constructor(host: string, authToken: string) {
        this.baseUrl = host;
        this.authToken = authToken;
    }

    private async sleep(delayMs: number): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    private async makeRequest(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<Response> {
        const url = `${this.baseUrl}/api/0${endpoint}`;

        const headers: Record<string, string> = {
            Authorization: `Bearer ${this.authToken}`,
            "Content-Type": "application/json",
        };

        if (options.headers) {
            Object.assign(headers, options.headers);
        }

        const requestOptions: RequestInit = {
            ...options,
            headers,
        };

        for (let attemptIndex = 0; attemptIndex < DEFAULT_MAX_RETRY_ATTEMPTS; attemptIndex += 1) {
            const response = await fetch(url, requestOptions);
            const isLastAttempt =
                attemptIndex === DEFAULT_MAX_RETRY_ATTEMPTS - 1;

            if (
                response.ok ||
                !isRetryableSentryStatus(response.status) ||
                isLastAttempt
            ) {
                return response;
            }

            const retryDelayMs = computeRetryDelayMs(attemptIndex, response);
            console.error(
                `Sentry API ${response.status} on ${endpoint}, retry ${
                    attemptIndex + 1
                }/${DEFAULT_MAX_RETRY_ATTEMPTS - 1} in ${retryDelayMs}ms`
            );
            await response.text();
            await this.sleep(retryDelayMs);
        }

        return fetch(url, requestOptions);
    }

    async get(endpoint: string): Promise<any> {
        const response = await this.makeRequest(endpoint, { method: "GET" });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                `API request failed: ${response.status} ${response.statusText} - ${errorText}`
            );
        }

        return response.json();
    }

    async post(endpoint: string, body: any): Promise<any> {
        const response = await this.makeRequest(endpoint, {
            method: "POST",
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                `API request failed: ${response.status} ${response.statusText} - ${errorText}`
            );
        }

        return response.json();
    }

    // Projects
    async getProjects(organizationSlug: string) {
        return this.get(`/organizations/${organizationSlug}/projects/`);
    }

    async createProject(
        organizationSlug: string,
        teamSlug: string,
        projectData: any
    ) {
        return this.post(
            `/teams/${organizationSlug}/${teamSlug}/projects/`,
            projectData
        );
    }

    async getProjectIssues(
        organizationSlug: string,
        projectSlug: string,
        query?: string
    ) {
        const endpoint = `/projects/${organizationSlug}/${projectSlug}/issues/`;
        return this.get(
            query ? `${endpoint}?query=${encodeURIComponent(query)}` : endpoint
        );
    }

    async getProjectEvents(organizationSlug: string, projectSlug: string) {
        return this.get(`/projects/${organizationSlug}/${projectSlug}/events/`);
    }

    async getProjectKeys(organizationSlug: string, projectSlug: string) {
        return this.get(`/projects/${organizationSlug}/${projectSlug}/keys/`);
    }

    // Issues
    async getIssue(organizationSlug: string, issueId: string) {
        return this.get(
            `/organizations/${organizationSlug}/issues/${issueId}/`
        );
    }

    async getIssueDetails(issueId: string) {
        return this.get(`/issues/${issueId}/`);
    }

    async getIssueEvents(
        organizationSlug: string,
        issueId: string,
        full: boolean = false
    ) {
        const endpoint = `/issues/${issueId}/events/`;
        return this.get(full ? `${endpoint}?full=true` : endpoint);
    }

    private buildQueryString(
        queryParameters: Record<string, string | number | boolean | undefined>
    ): string {
        const urlSearchParameters = new URLSearchParams();

        for (const [parameterName, parameterValue] of Object.entries(
            queryParameters
        )) {
            if (parameterValue === undefined) {
                continue;
            }

            urlSearchParameters.set(parameterName, String(parameterValue));
        }

        const queryString = urlSearchParameters.toString();
        return queryString ? `?${queryString}` : "";
    }

    private extractCursorFromLinkHeader(
        linkHeaderValue: string | null,
        relationName: "next" | "previous"
    ): string | null {
        if (!linkHeaderValue) {
            return null;
        }

        const linkParts = linkHeaderValue.split(",");
        for (const linkPart of linkParts) {
            if (!linkPart.includes(`rel="${relationName}"`)) {
                continue;
            }

            if (linkPart.includes('results="false"')) {
                return null;
            }

            const cursorMatch = linkPart.match(/cursor="([^"]+)"/);
            if (cursorMatch?.[1]) {
                return cursorMatch[1];
            }
        }

        return null;
    }

    async getIssueEventsPage(
        organizationSlug: string,
        issueId: string,
        options: {
            cursor?: string;
            full?: boolean;
            perPage?: number;
        } = {}
    ): Promise<{
        data: any[];
        nextCursor: string | null;
        previousCursor: string | null;
    }> {
        const queryString = this.buildQueryString({
            cursor: options.cursor,
            full: options.full ? "true" : undefined,
            per_page: options.perPage,
        });
        const response = await this.makeRequest(
            `/issues/${issueId}/events/${queryString}`,
            {
                method: "GET",
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                `API request failed: ${response.status} ${response.statusText} - ${errorText}`
            );
        }

        const responseData = await response.json();

        return {
            data: Array.isArray(responseData) ? responseData : [],
            nextCursor: this.extractCursorFromLinkHeader(
                response.headers.get("link"),
                "next"
            ),
            previousCursor: this.extractCursorFromLinkHeader(
                response.headers.get("link"),
                "previous"
            ),
        };
    }

    async resolveShortId(organizationSlug: string, shortId: string) {
        return this.get(
            `/organizations/${organizationSlug}/shortids/${shortId}/`
        );
    }

    async getEventById(organizationSlug: string, eventId: string) {
        return this.get(
            `/organizations/${organizationSlug}/eventids/${eventId}/`
        );
    }

    // Replays
    async getReplays(
        organizationSlug: string,
        params: Record<string, string> = {}
    ) {
        const queryParams = new URLSearchParams(params);
        const endpoint = `/organizations/${organizationSlug}/replays/`;
        return this.get(
            queryParams.toString() ? `${endpoint}?${queryParams}` : endpoint
        );
    }

    async getIssueEvent(
        organizationSlug: string,
        issueId: string,
        eventId: string
    ): Promise<any> {
        const issue = await this.getIssue(organizationSlug, issueId);
        const projectSlug = issue.project.slug;

        const endpoint = `/projects/${organizationSlug}/${projectSlug}/events/${eventId}/`;
        return this.get(endpoint);
    }

    async getProjectEvent(
        organizationSlug: string,
        projectSlug: string,
        eventId: string
    ): Promise<any> {
        return this.get(
            `/projects/${organizationSlug}/${projectSlug}/events/${eventId}/`
        );
    }
}
