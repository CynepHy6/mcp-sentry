# Апгрейд на `@sentry/api`

Статус и план перехода с самописного HTTP-клиента (`node-fetch` в `src/api/sentryClient.ts`) на официальный SDK [`@sentry/api`](https://www.npmjs.com/package/@sentry/api).

Обновлено: 2026-06-06.

## Намерение

Перейти на `@sentry/api` **поэтапно**, без big-bang:

1. Сначала export-tools (`export_issue_events_to_file`, `extract_issue_event_fields_to_file`) — там основной выигрыш.
2. Остальные tools (`list_projects`, `get_sentry_issue`, …) оставить на `SentryApiClient` до второго этапа.
3. Сохранить retry на `429` / `502` / `503` / `504` на уровне адаптера (SDK сам этого не даёт).

**Почему берём официальный клиент:**

- типы и контракт из OpenAPI;
- `listAnIssue_sEvents` с `start` / `end` — server-side фильтр по окну дат вместо листания всей истории issue;
- готовая пагинация (`fetchPage_*`, `paginateAll_*`, `paginateUpTo_*`);
- меньше поддержки своего HTTP-слоя.

## Текущий статус

| Область | Состояние |
|---------|-----------|
| HTTP-клиент | `src/api/sentryClient.ts` — `node-fetch`, retry, ручная пагинация `Link` |
| Export | `src/utils/eventExport.ts` — `since` / `until`, concurrency **10**, клиентская фильтрация дат при листании |
| `@sentry/api` | подключён для **export-tools** (`1.3.0`) |
| Node runtime | `engines: >=22`, CI Node **22**, `.nvmrc` |
| Версия пакета | `1.3.0` |

**Факт из прогона на `sentry.skyeng.tech`:** выгрузка `requestParams` за `2026-05-28` (issue `9849895`) — 547 событий за ~3.3 мин; пагинация проходит тысячи summary-событий, потому что API `/issues/{id}/events/` не фильтрует по дате на сервере.

## Целевое состояние (этап 1)

```text
src/api/
  sentryClient.ts          # без изменений на этапе 1 (остальные tools)
  sentrySdkExportClient.ts # новый адаптер: baseUrl, Bearer, retry поверх SDK
src/utils/eventExport.ts   # list + fetch full event через @sentry/api
```

Ключевые SDK-вызовы:

| Задача | SDK-функция |
|--------|-------------|
| Метаданные issue | `retrieveAnIssue` |
| События в диапазоне | `fetchPage_listAnIssue_sEvents` / `paginateUpTo_listAnIssue_sEvents` с `query.start`, `query.end` |
| Полный payload события | `retrieveAnEventForAProject` |

Пример окна «за 1 день»:

```json
{
  "query": {
    "start": "2026-05-28T00:00:00Z",
    "end": "2026-05-28T23:59:59.999Z",
    "per_page": 100
  }
}
```

## Предусловия (обязательно до merge)

| Требование | Сейчас | Нужно |
|------------|--------|-------|
| Node.js | **`>=22`**, CI 22 | готово (до подключения `@sentry/api`) |
| Зависимости | `node-fetch` | `@sentry/api`, peer `zod ^3.24` |
| Лицензия SDK | — | FSL-1.1-Apache-2.0 — принять для runtime-зависимости |
| Retry на 504 | есть в `sentryClient` | перенести в `sentrySdkExportClient` |

## План работ

### Этап 1 — export (целевой PR)

- [x] `package.json`: `engines.node: ">=22"` (версия `1.2.2`)
- [x] `.github/workflows/publish-dist.yml`: `node-version: "22"`
- [x] `package.json`: `@sentry/api` (peer `zod` уже есть)
- [x] `src/api/sentrySdkExportClient.ts`: auth, retry, обёртки list/get event
- [x] `eventExport.ts`: `collectMatchingEventSummaries` → SDK `start`/`end`
- [x] `index.ts`: отдельный `exportClient` для export-tools
- [x] Тесты: сборка query `start`/`end` из `since`/`until`
- [ ] Live-check: issue `9849895`, день `2026-05-28` — сравнить время и `matched_event_count` с `1.2.1`
- [x] `CHANGELOG.md`, bump `1.3.0`

### Этап 2 — остальные tools (позже)

- [ ] `list_projects`, `get_sentry_issue`, `get_sentry_event`, … на SDK
- [ ] Удалить `node-fetch`, если `sentryClient.ts` больше не нужен
- [ ] Обновить `AGENTS.md` / `README.md`

## Риски и как закрываем

| Риск | Митигация |
|------|-----------|
| `paginateAll_*` default `maxPages: 50` | Явный `maxPages` или цикл `fetchPage_*` |
| Node 20 у пользователей MCP | Поднять `engines`, документировать в README |
| 504 от nginx (видели на `getIssue`) | Retry в адаптере; org-scoped SDK endpoints |
| Регрессия export без `until` | Тест: только `since` → `start` без `end` |

## Ссылки

- npm: https://www.npmjs.com/package/@sentry/api
- REST API: https://docs.sentry.io/api/
- Схема: https://github.com/getsentry/sentry-api-schema
- Auth: https://docs.sentry.io/api/auth/

## Критерий готовности этапа 1

Export за один день на issue `9849895` завершается **существенно быстрее**, чем на `1.2.1`, при том же или сопоставимом `exported_event_count`, без потери retry-поведения на transient 504.
