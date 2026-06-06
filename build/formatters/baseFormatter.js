export class BaseFormatter {
    constructor(options) {
        this.formatType = options.format;
        this.view = options.view;
    }
    isMarkdown() {
        return this.formatType === "markdown";
    }
    isDetailed() {
        return this.view === "detailed";
    }
    createHeader(title, level = 1) {
        if (this.isMarkdown()) {
            return `${"#".repeat(level)} ${title}\n\n`;
        }
        return `${title}\n\n`;
    }
    createTable(headers, rows) {
        if (this.isMarkdown()) {
            let table = `| ${headers.join(" | ")} |\n`;
            table += `|${headers.map(() => "----").join("|")}|\n`;
            for (const row of rows) {
                table += `| ${row.join(" | ")} |\n`;
            }
            return table + "\n";
        }
        // Plain text table
        let result = "";
        for (const row of rows) {
            result += row.join(" | ") + "\n";
        }
        return result + "\n";
    }
    createList(items, ordered = false) {
        if (this.isMarkdown()) {
            return (items
                .map((item, index) => ordered ? `${index + 1}. ${item}` : `- ${item}`)
                .join("\n") + "\n\n");
        }
        return (items
            .map((item, index) => ordered ? `${index + 1}. ${item}` : `- ${item}`)
            .join("\n") + "\n\n");
    }
    createCodeBlock(code, language = "") {
        if (this.isMarkdown()) {
            return `\`\`\`${language}\n${code}\n\`\`\`\n\n`;
        }
        return `${code}\n\n`;
    }
    createLink(text, url) {
        if (this.isMarkdown()) {
            return `[${text}](${url})`;
        }
        return `${text}: ${url}`;
    }
    createBold(text) {
        if (this.isMarkdown()) {
            return `**${text}**`;
        }
        return text;
    }
    createSeparator() {
        if (this.isMarkdown()) {
            return "\n---\n\n";
        }
        return "\n" + "-".repeat(50) + "\n\n";
    }
}
