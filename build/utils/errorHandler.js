export class ErrorHandler {
    static handleApiError(error, context) {
        console.error(`Error in ${context}:`, error);
        return {
            content: [
                {
                    type: "text",
                    text: `Error in ${context}: ${error.message}`,
                },
            ],
            isError: true,
        };
    }
    static handleValidationError(message) {
        return {
            content: [
                {
                    type: "text",
                    text: `Validation error: ${message}`,
                },
            ],
            isError: true,
        };
    }
    static handleNotFoundError(resource, identifier) {
        return {
            content: [
                {
                    type: "text",
                    text: `${resource} not found: ${identifier}`,
                },
            ],
            isError: true,
        };
    }
}
