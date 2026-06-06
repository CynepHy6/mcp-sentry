const DEFAULT_INITIAL_RETRY_DELAY_MS = 1000;
const DEFAULT_MAX_RETRY_DELAY_MS = 30_000;

export function isRetryableSentryStatus(status: number): boolean {
    return status === 429 || status === 502 || status === 503 || status === 504;
}

export function parseRetryAfterMs(
    retryAfterHeader: string | null,
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
    resetHeader: string | null,
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
    response: { headers: { get(name: string): string | null } },
): number {
    const retryAfterDelay = parseRetryAfterMs(
        response.headers.get("Retry-After"),
    );
    if (retryAfterDelay !== null) {
        return Math.min(retryAfterDelay, DEFAULT_MAX_RETRY_DELAY_MS);
    }

    const resetDelay = parseRateLimitResetMs(
        response.headers.get("X-Sentry-Rate-Limit-Reset"),
    );
    if (resetDelay !== null && resetDelay > 0) {
        return Math.min(resetDelay, DEFAULT_MAX_RETRY_DELAY_MS);
    }

    const exponentialDelay =
        DEFAULT_INITIAL_RETRY_DELAY_MS * 2 ** attemptIndex;
    return Math.min(exponentialDelay, DEFAULT_MAX_RETRY_DELAY_MS);
}
