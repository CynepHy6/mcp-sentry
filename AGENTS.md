# mcp-sentry — инструкции для агента

MCP-сервер для Sentry API. Точка входа — `src/index.ts`. **Node.js ≥ 22** (`engines`, CI, `.nvmrc`). После правок: `npm run compile`, **поднять `version` в `package.json`**, push в `master` (CI → `dist` + git-тег `v{version}`) и reload MCP в Cursor.

Подробности для людей — [README.md](README.md). История версий — [CHANGELOG.md](CHANGELOG.md). План апгрейда на `@sentry/api` — [sentry-api-upgrade.md](sentry-api-upgrade.md).

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

### Node.js (nvm)

В корне репозитория — `.nvmrc` с версией **22**. Перед `npm install` / `compile` / `test`:

```bash
nvm use          # читает .nvmrc
node --version   # ожидается v22.x
```

Если Node 22 ещё не установлен: `nvm install 22`. Чтобы не переключать вручную в каждой сессии: `nvm alias default 22`.

**Важно:** `/usr/bin/node` может оставаться на 20 — для разработки опираться на `nvm use`, не на системный `node`.

### Локальный клон

- `git clone https://github.com/CynepHy6/mcp-sentry.git`
- `nvm use` (см. выше)
- `.env` в корне репозитория (см. `.env.example`). `index.ts` подхватывает его через `dotenv` из `build/` → `../.env`.
- Cursor MCP: `node` + `build/index.js`; переменные можно задать в `env` блока MCP или только в `.env`. Для локального клона в `command` лучше абсолютный путь к node из nvm, например `~/.nvm/versions/node/v22.22.3/bin/node`, иначе Cursor может подхватить системный Node 20.

| Переменная | Обязательна | По умолчанию |
|------------|-------------|--------------|
| `SENTRY_AUTH` | да | — |
| `SENTRY_HOST` | нет | `sentry.io` (с `https://`) |
| `PROTOCOL` | нет | `https` |

## Структура кода

```text
src/
  index.ts                 # регистрация MCP tools
  api/sentrySdkClient.ts   # @sentry/api — все tools
  api/sentryRetry.ts       # retry-хелперы
  api/sentryRetryFetch.ts  # retry поверх fetch для SDK
  formatters/              # markdown/plain formatters
  utils/                   # errorHandler, eventExport, eventExportDateRange
  types.ts                 # типы ответов Sentry API
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
nvm use
npm run compile
npm test
```

После изменений в `src/` — `npm run compile` + точечный тест в `tests/src/`.
