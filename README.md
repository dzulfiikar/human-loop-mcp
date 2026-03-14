<h1 align="center">
  🧑‍💻 human-loop-mcp-ts
</h1>

<p align="center">
  <strong>Browser-based human-in-the-loop MCP server</strong><br>
  Ask your AI agent to ask <em>you</em> — via polished browser dialogs.
</p>

<p align="center">
  <a href="#install">Install</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#tools">Tools</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#contributing">Contributing</a>
</p>

---

## What Is This?

An **MCP (Model Context Protocol) server** that gives AI agents a way to ask the human operator questions through the browser. When a tool is called:

1. A lightweight localhost HTTP server spins up
2. Your default browser opens a dialog page
3. You fill in the form and submit
4. The response flows back to the agent through MCP

No Python, no Tkinter, no Electron — just a Node.js process, a browser tab, and clean HTML.

### Why?

GUI-based human-in-the-loop tools often break on macOS (Accessibility permissions, focus stealing, Python framework builds). This project sidesteps all of that by using the browser as the UI layer — it works everywhere Node.js runs.

---

## Features

- **7 MCP tools** — text input, multiline, choice, confirmation, info, health check, usage guidance
- **Dark/light mode** — follows system preference automatically
- **Command-palette UI** — Linear/Raycast-inspired design with purple accent, monospace labels, noise background
- **Autocomplete** — `@` files, `#` GitHub issues/PRs, `/` slash commands, `?` keyboard shortcuts
- **Keyboard-first** — `⌘Enter` submit, `Esc` cancel, arrow-key navigation in dropdowns
- **Zero dependencies at runtime** — just `@modelcontextprotocol/sdk` and `zod`
- **Single-file HTML** — no static assets, no bundler, fully server-rendered

---

## Install

### npm (recommended)

```bash
npm install -g human-loop-mcp-ts
```

Or run directly without installing:

```bash
npx human-loop-mcp-ts
```

### From Source

```bash
git clone https://github.com/dzulfiikar/human-loop-mcp-ts.git
cd human-loop-mcp-ts
npm install
npm run build
```

---

## Quick Start

### Claude Desktop

Add to your Claude Desktop MCP config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "human-loop": {
      "command": "npx",
      "args": ["-y", "human-loop-mcp-ts"]
    }
  }
}
```

### Cursor / Windsurf

Add to `.cursor/mcp.json` or equivalent:

```json
{
  "mcpServers": {
    "human-loop": {
      "command": "npx",
      "args": ["-y", "human-loop-mcp-ts"]
    }
  }
}
```

### GitHub Copilot CLI

```toml
[mcp_servers.human-loop]
command = "npx"
args = ["-y", "human-loop-mcp-ts"]
```

### From Source (development)

```toml
[mcp_servers.human-loop-dev]
command = "npx"
args = ["tsx", "/path/to/human-loop-mcp-ts/src/index.ts"]
```

---

## Tools

| Tool | Description |
|------|-------------|
| `get_user_input` | Single-line text, password, integer, or float input |
| `get_user_choice` | Single-select or multi-select from a list of choices |
| `get_multiline_input` | Large text area with autocomplete (`@` `#` `/` `?`) |
| `show_confirmation_dialog` | Binary confirm/cancel dialog |
| `show_info_message` | Informational message with acknowledgement |
| `get_human_loop_prompt` | Returns guidance text on when to use the tools |
| `health_check` | Returns server health status and available tools |

### Example: Text Input

```json
{
  "title": "API Key",
  "prompt": "Enter your OpenAI API key:",
  "input_type": "password"
}
```

### Example: Choice

```json
{
  "title": "Database",
  "prompt": "Which database should I use?",
  "choices": ["PostgreSQL", "MySQL", "SQLite"],
  "allow_multiple": false
}
```

### Example: Confirmation

```json
{
  "title": "Deploy",
  "message": "Deploy v2.1.0 to production?",
  "confirm_label": "Deploy",
  "cancel_label": "Abort"
}
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HITL_HOST` | `127.0.0.1` | HTTP server bind address |
| `HITL_PORT` | *(ephemeral)* | Fixed HTTP port. If unset, the OS assigns a random port. |
| `HITL_NO_LAUNCH` | *(unset)* | Set to `1` to print dialog URLs to stderr instead of auto-opening the browser. |

### Programmatic Options

```typescript
import { BrowserDialogServer } from "human-loop-mcp-ts/browser/browser-dialog-server";

const server = new BrowserDialogServer({
  port: 8080,
  launchUrl: async (url) => {
    console.log(`Open: ${url}`);
  },
});
```

---

## Architecture

```
┌──────────────────────────────────────────┐
│           MCP Client (AI Agent)          │
│      Claude / Cursor / Copilot CLI       │
└──────────────┬───────────────────────────┘
               │ stdio (JSON-RPC)
┌──────────────▼───────────────────────────┐
│  index.ts — MCP Server & Tool Registry   │
├──────────────────────────────────────────┤
│  service.ts — Business Logic Layer       │
├──────────────────────────────────────────┤
│  browser-dialog-server.ts — HTTP Server  │
│  dialog-session-manager.ts — Sessions    │
│  html.ts — HTML/CSS/JS Renderer          │
└──────────────┬───────────────────────────┘
               │ HTTP (localhost)
┌──────────────▼───────────────────────────┐
│        Browser — Dialog UI               │
│  Dark/light mode · Autocomplete · KBD    │
└──────────────────────────────────────────┘
```

---

## Development

```bash
npm install          # Install dependencies
npm run dev          # Run from source (tsx, hot-reload)
npm run build        # Compile to dist/
npm test             # Run tests (Vitest)
npm run typecheck    # Type-check without emitting
```

### Project Structure

```
src/
├── index.ts                    MCP server entry point & tool registration
├── service.ts                  Tool handler business logic
└── browser/
    ├── browser-dialog-server.ts   HTTP server, browser launcher, API endpoints
    ├── dialog-session-manager.ts  Session lifecycle & input validation
    └── html.ts                    Dialog page HTML/CSS/JS renderer

tests/
├── service.test.ts
├── dialog-session-manager.test.ts
└── browser-dialog-server.test.ts
```

---

## How It Works

1. **MCP client calls a tool** (e.g., `get_user_input`) via stdio JSON-RPC
2. **`index.ts`** routes the call to `HumanLoopService`
3. **`service.ts`** transforms args and calls `BrowserDialogServer.openDialog()`
4. **`browser-dialog-server.ts`** creates a session, starts HTTP if needed, opens the browser
5. **`html.ts`** renders a self-contained HTML page with the dialog form
6. **User submits the form** → POST handler validates and resolves the session promise
7. **Response flows back** through the MCP tool result to the AI agent

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, code style, and PR guidelines.

## License

[MIT](LICENSE)
