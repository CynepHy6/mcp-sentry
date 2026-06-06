export const DEFAULT_ISSUE_EVENTS_PAGE_SIZE = 100;

export function normalizeUtcDateString(inputValue: string): string {
    const plainDatePattern = /^\d{4}-\d{2}-\d{2}$/;
    const zonelessDateTimePattern =
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/;

    let normalizedValue = inputValue.trim();

    if (plainDatePattern.test(normalizedValue)) {
        normalizedValue = `${normalizedValue}T00:00:00.000Z`;
    } else if (zonelessDateTimePattern.test(normalizedValue)) {
        normalizedValue = `${normalizedValue}Z`;
    }

    const parsedDate = new Date(normalizedValue);
    if (Number.isNaN(parsedDate.getTime())) {
        throw new Error(
            `Invalid since value "${inputValue}". Use YYYY-MM-DD or an ISO timestamp in UTC.`,
        );
    }

    return parsedDate.toISOString();
}

export function normalizeUtcUntilDateString(inputValue: string): string {
    const plainDatePattern = /^\d{4}-\d{2}-\d{2}$/;

    if (plainDatePattern.test(inputValue.trim())) {
        return `${inputValue.trim()}T23:59:59.999Z`;
    }

    return normalizeUtcDateString(inputValue);
}

/** Upper bound for open-ended export windows when `until` is omitted. */
export function defaultUtcUntilNow(): string {
    return new Date().toISOString();
}

export function resolveEffectiveUntilUtc(until?: string): string {
    return until ? normalizeUtcUntilDateString(until) : defaultUtcUntilNow();
}

export function buildIssueEventsListQuery(
    sinceUtc: string,
    untilUtc?: string,
): {
    start: string;
    end: string;
    per_page: number;
} {
    return {
        start: sinceUtc,
        end: untilUtc ?? defaultUtcUntilNow(),
        per_page: DEFAULT_ISSUE_EVENTS_PAGE_SIZE,
    };
}
