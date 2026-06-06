# mcp-sentry

MCP-сервер для **Sentry API** в Cursor.

**Требования:** Node.js **≥ 22** (для будущей миграции на `@sentry/api` и CI). В репозитории есть `.nvmrc` — при работе из клона: `nvm use`.

## Быстрый старт (npx, без клона)

1. Добавить в Cursor MCP (`~/.cursor/mcp.json` или project config):

```json
{
  "mcpServers": {
    "sentry": {
      "command": "npx",
      "args": ["-y", "github:CynepHy6/mcp-sentry#semver:^1"],
      "env": {
        "SENTRY_AUTH": "your_sentry_auth_token",
        "SENTRY_HOST": "https://sentry.example.com"
      }
    }
  }
}
```

Креды передаются **только через `env`** в MCP-конфиге

| Переменная | Обязательна | По умолчанию |
|------------|-------------|--------------|
| `SENTRY_AUTH` | да | — |
| `SENTRY_HOST` | нет | `https://sentry.io` |
| `PROTOCOL` | нет | `https` |

2. Reload MCP в Cursor.

### Версия в `args`

`npx` скачивает пакет из GitHub по адресу `github:CynepHy6/mcp-sentry`. Суффикс после `#` выбирает, **какую версию** установить:

- каждый релиз помечен git-тегом вида `v1.2.0` (история — в [CHANGELOG.md](CHANGELOG.md));
- `npx` сохраняет установку в `~/.npm/_npx/<hash>/`, где hash зависит от строки в `args`.

| Ref | Пример `args` | Когда использовать |
|-----|---------------|-------------------|
| диапазон `v1.x` | `["-y", "github:CynepHy6/mcp-sentry#semver:^1"]` | по умолчанию; при старте MCP подтягивает максимальный git-тег `v1.x` |
| конкретный тег | `["-y", "github:CynepHy6/mcp-sentry#v1.2.0"]` | зафиксировать версию |
| exact semver | `["-y", "github:CynepHy6/mcp-sentry#semver:1.2.0"]` | то же, через semver (ищет тег `v1.2.0`) |

**Обновление:** с `#semver:^1` новый релиз `v1.x` обычно подтягивается при старте MCP — reload Cursor чаще всего достаточно. С `#v1.2.0` версия зафиксирована: смените ref или удалите sandbox. Если не помогло — `npx clear-npx-cache` и снова reload MCP.

## Альтернатива: локальный клон

```bash
git clone https://github.com/CynepHy6/mcp-sentry.git
cd mcp-sentry
nvm use                # Node 22 из .nvmrc
cp .env.example .env   # заполнить креды
npm install && npm run compile
```

```json
{
  "mcpServers": {
    "sentry": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-sentry/build/index.js"]
    }
  }
}
```

Креды можно держать в `.env` в корне клонированного репозитория.

## Что умеет

- просмотр проектов организации;
- получение issue и событий по ID или URL;
- извлечение контекста из событий;
- экспорт событий и полей в локальные JSONL-файлы.

## Документация

| Файл | Для кого |
|------|----------|
| [AGENTS.md](AGENTS.md) | разработка, workflows |
| [CHANGELOG.md](CHANGELOG.md) | история релизов |
| [mcp-config.example.json](mcp-config.example.json) | MCP-конфиг npx, диапазон `v1.x` (`#semver:^1`) |
