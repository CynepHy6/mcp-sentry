# mcp-sentry — инструкции для агента

MCP-сервер для Sentry API. Точка входа — `src/index.ts`. После правок: `npm run compile`, **поднять `version` в `package.json`**, push в `master` (CI → `dist` + git-тег `v{version}`) и reload MCP в Cursor.

Подробности для людей — [README.md](README.md). История версий — [CHANGELOG.md](CHANGELOG.md).

## Конфигурация

### npx (без клона)

```json
{
  "command": "npx",
  "args": ["-y", "github:CynepHy6/mcp-sentry#semver:^1"],
  "env": {
    "SENTRY_AUTH": "token",
    "SENTRY_HOST": "https://sentry.example.com"
  }
}
```

Креды **только в `env` MCP-конфига**. `dotenv` из `.env` пакета не рассчитан на этот режим.

Релиз: bump `version` в `package.json` → push `master` → CI → `dist` + git-тег `v{version}`.

**Скрипт сборки — `compile`, не `build`:** см. `.cursor/rules/mcp-server-development.mdc` (npm/cli#4003). На `dist` уходит runtime-only `package.json` без `devDependencies` и compile-скриптов.

**Ref в `args`:**

```json
"github:CynepHy6/mcp-sentry#semver:^1"
"github:CynepHy6/mcp-sentry#v1.2.0"
"github:CynepHy6/mcp-sentry#semver:1.2.0"
```

### Локальный клон

- `git clone https://github.com/CynepHy6/mcp-sentry.git`
- `.env` в корне репозитория (см. `.env.example`). `index.ts` подхватывает его через `dotenv` из `build/` → `../.env`.
- Cursor MCP: `node` + `build/index.js`; переменные можно задать в `env` блока MCP или только в `.env`.

| Переменная | Обязательна | По умолчанию |
|------------|-------------|--------------|
| `SENTRY_AUTH` | да | — |
| `SENTRY_HOST` | нет | `sentry.io` (с `https://`) |
| `PROTOCOL` | нет | `https` |

## Структура кода

```text
src/
  index.ts              # регистрация MCP tools
  api/sentryClient.ts   # HTTP-клиент Sentry API
  formatters/           # markdown/plain formatters
  utils/                # errorHandler, eventExport
  types.ts              # типы ответов Sentry API
tests/
  src/                  # unit-тесты utils
```

## Основные tools

| Tool | Назначение |
|------|------------|
| `list_projects` | список проектов организации |
| `get_sentry_issue` | детали issue по ID или URL |
| `get_sentry_event` | конкретное событие issue |
| `list_issue_events` | список событий issue |
| `extract_issue_context_data` | контекст из всех событий issue |
| `export_issue_events_to_file` | выгрузка событий в JSONL |
| `extract_issue_event_fields_to_file` | извлечение полей событий в JSONL |

## Отладка

```bash
npm run compile
npm test
```

После изменений в `src/` — `npm run compile` + точечный тест в `tests/src/`.
