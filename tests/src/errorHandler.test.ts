import { ErrorHandler } from "../../src/utils/errorHandler.js";

describe("ErrorHandler", () => {
    it("formats API errors for MCP tool responses", () => {
        const response = ErrorHandler.handleApiError(
            new Error("upstream failed"),
            "list_projects",
        );

        expect(response.isError).toBe(true);
        expect(response.content[0].text).toContain("list_projects");
        expect(response.content[0].text).toContain("upstream failed");
    });

    it("formats validation errors", () => {
        const response = ErrorHandler.handleValidationError("missing slug");

        expect(response.isError).toBe(true);
        expect(response.content[0].text).toContain("missing slug");
    });
});
