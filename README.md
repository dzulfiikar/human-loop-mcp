<h1 align="center">
  human-loop-mcp
</h1>

<p align="center">
  <strong>Browser-based human-in-the-loop MCP server</strong><br>
  Ask your AI agent to ask <em>you</em> — via polished browser dialogs.
</p>

<p align="center">
  <a href="#features">Features</a> &middot;
  <a href="#install">Install</a> &middot;
  <a href="#quick-start">Quick Start</a> &middot;
  <a href="#tools">Tools</a> &middot;
  <a href="#file-attachments">Attachments</a> &middot;
  <a href="#configuration">Configuration</a> &middot;
  <a href="#architecture">Architecture</a> &middot;
  <a href="#development">Development</a>
</p>

---

## What Is This?

An **MCP (Model Context Protocol) server** that gives AI agents a way to ask the human operator questions through the browser.

1. A lightweight localhost HTTP server spins up
2. Your default browser opens a dialog page
3. You fill in the form (optionally attaching files) and submit
4. The response flows back to the agent through MCP

No Python, no Tkinter, no Electron — just a Node.js process, a browser tab, and clean HTML.

### Why?

GUI-based human-in-the-loop tools often break on macOS (Accessibility permissions, focus stealing, Python framework builds). This project sidesteps all of that by using the browser as the UI layer — it works everywhere Node.js runs.

---

## Features

| | |
|---|---|
| **7 MCP tools** | Text input, multiline, choice, confirmation, info, health check, and usage guidance |
| **File attachments** | Drag-and-drop, paste, or click-to-upload files in the multiline dialog. Files are base64-encoded and returned alongside the text response (5 MB per-file limit) |
| **Autocomplete** | `@` files, `#` GitHub issues/PRs, `/` slash commands, `?` keyboard shortcuts |
| **Dark/light mode** | Follows system preference automatically |
| **Keyboard-first** | `Cmd+Enter` submit, `Esc` cancel, arrow-key navigation in dropdowns |
| **Command-palette UI** | Linear/Raycast-inspired design with purple accents, monospace labels, noise texture background |
| **Zero bloat** | Only two runtime dependencies: `@modelcontextprotocol/sdk` and `zod` |
| **Single-file HTML** | No static assets, no bundler — fully server-rendered |

---

## Install

### npm (recommended)

```bash
npm install -g human-loop-mcp
```

Or run directly without installing:

```bash
npx human-loop-mcp
```

### From source

```bash
git clone https://github.com/dzulfiikar/human-loop-mcp.git
cd human-loop-mcp
npm install
npm run build
```

---

## Quick Start

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "human-loop": {
      "command": "npx",
      "args": ["-y", "human-loop-mcp"]
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
      "args": ["-y", "human-loop-mcp"]
    }
  }
}
```

### GitHub Copilot CLI

```toml
[mcp_servers.human-loop]
command = "npx"
args = ["-y", "human-loop-mcp"]
```

### From source (development)

```toml
[mcp_servers.human-loop-dev]
command = "npx"
args = ["tsx", "/path/to/human-loop-mcp/src/index.ts"]
```

---

## Tools

| Tool | Description |
|------|-------------|
| `get_user_input` | Single-line text, password, integer, or float input |
| `get_user_choice` | Single or multi-select from a list of choices |
| `get_multiline_input` | Large text area with autocomplete and file attachments |
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

## File Attachments

The `get_multiline_input` dialog supports file attachments through three methods:

| Method | How |
|--------|-----|
| **Drag and drop** | Drag files onto the textarea — a drop overlay appears |
| **Paste** | `Cmd+V` / `Ctrl+V` with an image or file in the clipboard |
| **Upload button** | Click the paperclip "Attach" button below the textarea |

### Attachment behavior

- **Any file type** is accepted
- **5 MB per-file limit** — oversized files are rejected with an inline error
- Files are **base64-encoded** and returned in the tool result alongside the text value
- **Image previews** are shown as thumbnails in the attachment chips
- Each chip shows the file name, size, and a remove button
- When no files are attached, the result is identical to the previous format (fully backward-compatible)

### Result format

When attachments are present, the `get_multiline_input` tool returns:

```json
{
  "action": "submit",
  "value": "Here is the screenshot",
  "attachments": [
    {
      "name": "screenshot.png",
      "type": "image/png",
      "size": 48210,
      "data": "iVBORw0KGgo..."
    }
  ]
}
```

When no attachments are provided, the `attachments` field is omitted entirely.

---

## Configuration

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HITL_HOST` | `127.0.0.1` | HTTP server bind address |
| `HITL_PORT` | *(ephemeral)* | Fixed HTTP port. If unset, the OS assigns a random port |
| `HITL_NO_LAUNCH` | *(unset)* | Set to `1` to print dialog URLs to stderr instead of auto-opening the browser |

### Programmatic usage

```typescript
import { BrowserDialogServer } from "human-loop-mcp/browser/browser-dialog-server";

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
│  index.ts        Tool registration       │
│  service.ts      Business logic          │
│  browser-dialog-server.ts   HTTP + APIs  │
│  dialog-session-manager.ts  Sessions     │
│  html.ts         HTML/CSS/JS renderer    │
└──────────────┬───────────────────────────┘
               │ HTTP (localhost)
┌──────────────▼───────────────────────────┐
│         Browser Dialog UI                │
│  Forms · Autocomplete · Attachments      │
│  Dark/light · Keyboard shortcuts         │
└──────────────────────────────────────────┘
```

### Data flow

1. **MCP client calls a tool** (e.g. `get_multiline_input`) via stdio JSON-RPC
2. **`index.ts`** routes the call to `HumanLoopService`
3. **`service.ts`** transforms args and calls `BrowserDialogServer.openDialog()`
4. **`browser-dialog-server.ts`** creates a session, starts HTTP if needed, opens the browser
5. **`html.ts`** renders a self-contained HTML page with the dialog form
6. **User submits** (with optional file attachments) — the POST handler validates and resolves the session promise
7. **Response flows back** through MCP to the AI agent, including any base64-encoded attachments

---

## Development

```bash
npm install          # Install dependencies
npm run dev          # Run from source (tsx, hot-reload)
npm run build        # Compile to dist/
npm test             # Run tests (Vitest)
npm run typecheck    # Type-check without emitting
```

### Project structure

```
src/
├── index.ts                       MCP server entry point & tool registration
├── service.ts                     Tool handler business logic
└── browser/
    ├── browser-dialog-server.ts   HTTP server, browser launcher, API endpoints
    ├── dialog-session-manager.ts  Session lifecycle, validation & attachment types
    └── html.ts                    Dialog page renderer (forms, autocomplete, attachments)

tests/
├── service.test.ts
├── dialog-session-manager.test.ts
└── browser-dialog-server.test.ts
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, code style, and PR guidelines.

## License

[MIT](LICENSE)
