import fetch from "node-fetch";
export class SentryApiClient {
    constructor(host, authToken) {
        this.baseUrl = host;
        this.authToken = authToken;
    }
    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseUrl}/api/0${endpoint}`;
        const headers = {
            Authorization: `Bearer ${this.authToken}`,
            "Content-Type": "application/json",
        };
        if (options.headers) {
            Object.assign(headers, options.headers);
        }
        const requestOptions = {
            ...options,
            headers,
        };
        const response = await fetch(url, requestOptions);
        return response;
    }
    async get(endpoint) {
        const response = await this.makeRequest(endpoint, { method: "GET" });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }
        return response.json();
    }
    async post(endpoint, body) {
        const response = await this.makeRequest(endpoint, {
            method: "POST",
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }
        return response.json();
    }
    // Projects
    async getProjects(organizationSlug) {
        return this.get(`/organizations/${organizationSlug}/projects/`);
    }
    async createProject(organizationSlug, teamSlug, projectData) {
        return this.post(`/teams/${organizationSlug}/${teamSlug}/projects/`, projectData);
    }
    async getProjectIssues(organizationSlug, projectSlug, query) {
        const endpoint = `/projects/${organizationSlug}/${projectSlug}/issues/`;
        return this.get(query ? `${endpoint}?query=${encodeURIComponent(query)}` : endpoint);
    }
    async getProjectEvents(organizationSlug, projectSlug) {
        return this.get(`/projects/${organizationSlug}/${projectSlug}/events/`);
    }
    async getProjectKeys(organizationSlug, projectSlug) {
        return this.get(`/projects/${organizationSlug}/${projectSlug}/keys/`);
    }
    // Issues
    async getIssue(organizationSlug, issueId) {
        return this.get(`/organizations/${organizationSlug}/issues/${issueId}/`);
    }
    async getIssueEvents(organizationSlug, issueId, full = false) {
        const endpoint = `/issues/${issueId}/events/`;
        return this.get(full ? `${endpoint}?full=true` : endpoint);
    }
    buildQueryString(queryParameters) {
        const urlSearchParameters = new URLSearchParams();
        for (const [parameterName, parameterValue] of Object.entries(queryParameters)) {
            if (parameterValue === undefined) {
                continue;
            }
            urlSearchParameters.set(parameterName, String(parameterValue));
        }
        const queryString = urlSearchParameters.toString();
        return queryString ? `?${queryString}` : "";
    }
    extractCursorFromLinkHeader(linkHeaderValue, relationName) {
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
    async getIssueEventsPage(organizationSlug, issueId, options = {}) {
        const queryString = this.buildQueryString({
            cursor: options.cursor,
            full: options.full ? "true" : undefined,
            per_page: options.perPage,
        });
        const response = await this.makeRequest(`/issues/${issueId}/events/${queryString}`, {
            method: "GET",
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }
        const responseData = await response.json();
        return {
            data: Array.isArray(responseData) ? responseData : [],
            nextCursor: this.extractCursorFromLinkHeader(response.headers.get("link"), "next"),
            previousCursor: this.extractCursorFromLinkHeader(response.headers.get("link"), "previous"),
        };
    }
    async resolveShortId(organizationSlug, shortId) {
        return this.get(`/organizations/${organizationSlug}/shortids/${shortId}/`);
    }
    async getEventById(organizationSlug, eventId) {
        return this.get(`/organizations/${organizationSlug}/eventids/${eventId}/`);
    }
    // Replays
    async getReplays(organizationSlug, params = {}) {
        const queryParams = new URLSearchParams(params);
        const endpoint = `/organizations/${organizationSlug}/replays/`;
        return this.get(queryParams.toString() ? `${endpoint}?${queryParams}` : endpoint);
    }
    async getIssueEvent(organizationSlug, issueId, eventId) {
        // First get the issue to find which project it belongs to
        const issue = await this.getIssue(organizationSlug, issueId);
        const projectSlug = issue.project.slug;
        // Then get the event from the project
        const endpoint = `/projects/${organizationSlug}/${projectSlug}/events/${eventId}/`;
        return this.get(endpoint);
    }
    async getProjectEvent(organizationSlug, projectSlug, eventId) {
        return this.get(`/projects/${organizationSlug}/${projectSlug}/events/${eventId}/`);
    }
}
