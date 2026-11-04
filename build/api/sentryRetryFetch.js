import { computeRetryDelayMs, isRetryableSentryStatus, } from "./sentryRetry.js";
const DEFAULT_MAX_RETRY_ATTEMPTS = 8;
async function sleep(delayMs) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
}
export function createRetryFetch(baseFetch = globalThis.fetch) {
    return async (input, init) => {
        let requestUrl = "";
        if (typeof input === "string") {
            requestUrl = input;
        }
        else if (input instanceof URL) {
            requestUrl = input.toString();
        }
        else if (input instanceof Request) {
            requestUrl = input.url;
        }
        for (let attemptIndex = 0; attemptIndex < DEFAULT_MAX_RETRY_ATTEMPTS; attemptIndex += 1) {
            const response = await baseFetch(input, init);
            const isLastAttempt = attemptIndex === DEFAULT_MAX_RETRY_ATTEMPTS - 1;
            if (response.ok ||
                !isRetryableSentryStatus(response.status) ||
                isLastAttempt) {
                return response;
            }
            const retryDelayMs = computeRetryDelayMs(attemptIndex, response);
            console.error(`Sentry API ${response.status} on ${requestUrl}, retry ${attemptIndex + 1}/${DEFAULT_MAX_RETRY_ATTEMPTS - 1} in ${retryDelayMs}ms`);
            await response.text();
            await sleep(retryDelayMs);
        }
        return baseFetch(input, init);
    };
}
