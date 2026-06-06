import {
    buildIssueEventsListQuery,
    defaultUtcUntilNow,
    normalizeUtcDateString,
    normalizeUtcUntilDateString,
    resolveEffectiveUntilUtc,
} from "../../src/utils/eventExportDateRange.js";

describe("eventExportDateRange", () => {
    it("normalizes plain date since to UTC start of day", () => {
        expect(normalizeUtcDateString("2026-05-28")).toBe(
            "2026-05-28T00:00:00.000Z",
        );
    });

    it("normalizes plain date until to UTC end of day", () => {
        expect(normalizeUtcUntilDateString("2026-05-28")).toBe(
            "2026-05-28T23:59:59.999Z",
        );
    });

    it("builds SDK list query with start and end", () => {
        expect(
            buildIssueEventsListQuery(
                "2026-05-28T00:00:00.000Z",
                "2026-05-28T23:59:59.999Z",
            ),
        ).toEqual({
            start: "2026-05-28T00:00:00.000Z",
            end: "2026-05-28T23:59:59.999Z",
            per_page: 100,
        });
    });

    it("defaults end to now when until is omitted", () => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2026-06-06T16:54:40.380Z"));

        expect(
            buildIssueEventsListQuery("2026-05-28T00:00:00.000Z"),
        ).toEqual({
            start: "2026-05-28T00:00:00.000Z",
            end: "2026-06-06T16:54:40.380Z",
            per_page: 100,
        });

        jest.useRealTimers();
    });

    it("resolveEffectiveUntilUtc uses now when until is omitted", () => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2026-06-06T16:54:40.380Z"));

        expect(resolveEffectiveUntilUtc()).toBe("2026-06-06T16:54:40.380Z");
        expect(defaultUtcUntilNow()).toBe("2026-06-06T16:54:40.380Z");

        jest.useRealTimers();
    });
});
