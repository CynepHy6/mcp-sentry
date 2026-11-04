/**
 * MCP-аннотации инструментов. Клиент (Cursor, Claude, Рабочий стол) по `readOnlyHint` решает,
 * спрашивать ли человека и пускать ли вызов в режимах только чтения. Без аннотации клиент угадывает
 * по имени, а `extract_*` и `export_*` под шаблоны чтения не попадают.
 */
const READ_ONLY = { readOnlyHint: true, openWorldHint: true };
/** Только добавляет: пишет на диск новый файл, ничего не меняя в Sentry. */
const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: true };
export const TOOL_ANNOTATIONS = {
    list_projects: READ_ONLY,
    list_project_issues: READ_ONLY,
    get_sentry_issue: READ_ONLY,
    list_issue_events: READ_ONLY,
    resolve_short_id: READ_ONLY,
    // Несмотря на имя, файла не пишет: собирает поля событий и возвращает JSON в ответе.
    extract_issue_context_data: READ_ONLY,
    // Пишут новый JSONL в tmp/sentry-exports или output_directory; имя с меткой времени до миллисекунд,
    // поэтому чужой файл не затирают. Два одинаковых экспорта в одну миллисекунду попали бы в один путь.
    export_issue_events_to_file: WRITE,
    extract_issue_event_fields_to_file: WRITE,
    get_sentry_event: READ_ONLY,
};
/** Аннотации инструмента по имени. Незнакомое имя — ошибка: новый инструмент без пометки не регистрируется. */
export function toolAnnotations(name) {
    const annotations = TOOL_ANNOTATIONS[name];
    if (!annotations)
        throw new Error(`No MCP annotations for tool "${name}"`);
    return annotations;
}
