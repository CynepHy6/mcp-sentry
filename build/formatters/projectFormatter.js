import { BaseFormatter } from "./baseFormatter.js";
export class ProjectFormatter extends BaseFormatter {
    constructor(options) {
        super(options);
    }
    formatData(projects) {
        if (this.isDetailed()) {
            return this.formatDetailed(projects);
        }
        return this.formatSummary(projects);
    }
    formatDetailed(projects) {
        let output = this.createHeader("Sentry Projects");
        if (this.isMarkdown()) {
            const headers = [
                "ID",
                "Name",
                "Slug",
                "Platform",
                "Teams",
                "Environments",
                "Features",
            ];
            const rows = projects.map((project) => [
                project.id,
                project.name,
                project.slug,
                project.platform || "N/A",
                project.teams.map((team) => team.name).join(", "),
                project.environments?.join(", ") || "None",
                project.features?.join(", ") || "None",
            ]);
            output += this.createTable(headers, rows);
        }
        else {
            for (const project of projects) {
                output += `ID: ${project.id}\n`;
                output += `Name: ${project.name}\n`;
                output += `Slug: ${project.slug}\n`;
                output += `Platform: ${project.platform || "N/A"}\n`;
                output += `Teams: ${project.teams
                    .map((team) => team.name)
                    .join(", ")}\n`;
                output += `Environments: ${project.environments?.join(", ") || "None"}\n`;
                output += `Features: ${project.features?.join(", ") || "None"}\n\n`;
            }
        }
        output += this.createHeader("Summary", 2);
        output += `Total Projects: ${projects.length}\n`;
        return output;
    }
    formatSummary(projects) {
        let output = this.createHeader("Sentry Projects");
        const items = projects.map((project) => `${this.createBold(project.name)} (${project.slug}): ID ${project.id}`);
        output += this.createList(items);
        output += `Total Projects: ${projects.length}`;
        return output;
    }
}
