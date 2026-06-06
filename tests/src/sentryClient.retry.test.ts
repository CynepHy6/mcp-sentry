import {
    computeRetryDelayMs,
    isRetryableSentryStatus,
    parseRateLimitResetMs,
    parseRetryAfterMs,
} from "../../src/api/sentryClient.js";

describe("sentryClient retry helpers", () => {
    it("marks rate-limit and transient upstream statuses as retryable", () => {
        expect(isRetryableSentryStatus(429)).toBe(true);
        expect(isRetryableSentryStatus(503)).toBe(true);
        expect(isRetryableSentryStatus(400)).toBe(false);
        expect(isRetryableSentryStatus(404)).toBe(false);
    });

    it("parses Retry-After seconds", () => {
        expect(parseRetryAfterMs("2")).toBe(2000);
    });

    it("parses X-Sentry-Rate-Limit-Reset as unix seconds", () => {
        const futureReset = String(Math.floor(Date.now() / 1000) + 5);
        const delay = parseRateLimitResetMs(futureReset);

        expect(delay).not.toBeNull();
        expect(delay!).toBeGreaterThan(0);
        expect(delay!).toBeLessThanOrEqual(5000);
    });

    it("prefers Retry-After over exponential backoff", () => {
        const delay = computeRetryDelayMs(2, {
            headers: {
                get(headerName: string) {
                    if (headerName === "Retry-After") {
                        return "3";
                    }
                    return null;
                },
            },
        });

        expect(delay).toBe(3000);
    });

    it("uses exponential backoff when retry headers are absent", () => {
        const delay = computeRetryDelayMs(2, {
            headers: {
                get() {
                    return null;
                },
            },
        });

        expect(delay).toBe(4000);
    });
});
