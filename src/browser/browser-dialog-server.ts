import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { URL } from "node:url";
import { spawn, execFile } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";

import {
  DialogSessionManager,
  type DialogDefinition,
  type DialogResult,
} from "./dialog-session-manager.js";
import { renderDialogPage } from "./html.js";

export interface BrowserDialogServerOptions {
  host?: string;
  port?: number;
  launchUrl?: (url: string) => Promise<void>;
}

export interface BrowserDialogHealth {
  status: "healthy";
  guiAvailable: boolean;
  baseUrl: string | null;
}

const SLASH_COMMANDS = [
  { name: "/submit", description: "Submit the current response" },
  { name: "/cancel", description: "Cancel and close the dialog" },
  { name: "/clear", description: "Clear the input field" },
  { name: "/help", description: "Show available commands" },
];

const KEYBOARD_SHORTCUTS = [
  { keys: "⌘+Enter", description: "Submit the form" },
  { keys: "Escape", description: "Cancel the dialog" },
  { keys: "@ + text", description: "Mention a file" },
  { keys: "# + text", description: "Reference an issue or PR" },
  { keys: "/ + text", description: "Run a slash command" },
  { keys: "? + text", description: "Search shortcuts" },
];

const IGNORED_DIRS = new Set([
  "node_modules", ".git", ".next", "dist", "build", ".cache",
  "__pycache__", ".venv", "venv", "coverage", ".turbo", ".svelte-kit",
]);

export class BrowserDialogServer {
  private readonly host: string;
  private readonly fixedPort: number | undefined;
  private readonly launchUrl: (url: string) => Promise<void>;
  private readonly sessions = new DialogSessionManager();
  private server: Server | undefined;
  private port: number | undefined;

  constructor(options: BrowserDialogServerOptions = {}) {
    this.host = options.host ?? "127.0.0.1";
    this.fixedPort = options.port;
    this.launchUrl = options.launchUrl ?? defaultLaunchUrl;
  }

  async openDialog(definition: DialogDefinition): Promise<DialogResult> {
    await this.ensureStarted();

    const session = this.sessions.createSession(definition);
    const url = `${this.getBaseUrl()}/dialog/${encodeURIComponent(session.id)}`;

    await this.launchUrl(url);
    return session.result;
  }

  async health(): Promise<BrowserDialogHealth> {
    await this.ensureStarted();

    return {
      status: "healthy",
      guiAvailable: true,
      baseUrl: this.getBaseUrl(),
    };
  }

  async close(): Promise<void> {
    if (!this.server) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.server?.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    this.server = undefined;
    this.port = undefined;
  }

  private async ensureStarted(): Promise<void> {
    if (this.server && this.port) {
      return;
    }

    this.server = createServer((request, response) => {
      void this.handleRequest(request, response);
    });

    await new Promise<void>((resolve, reject) => {
      this.server?.once("error", reject);
      this.server?.listen(this.fixedPort ?? 0, this.host, () => {
        const address = this.server?.address();
        if (!address || typeof address === "string") {
          reject(new Error("Failed to determine dialog server address"));
          return;
        }

        this.port = address.port;
        resolve();
      });
    });
  }

  private getBaseUrl(): string {
    if (!this.port) {
      throw new Error("Dialog server has not started yet");
    }

    return `http://${this.host}:${this.port}`;
  }

  private async handleRequest(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> {
    const method = request.method ?? "GET";
    const requestUrl = new URL(request.url ?? "/", this.getBaseUrl());

    if (requestUrl.pathname === "/") {
      this.respondHtml(
        response,
        200,
        "<!doctype html><html><body><h1>Human Loop MCP TS</h1></body></html>",
      );
      return;
    }

    if (requestUrl.pathname === "/thanks") {
      this.respondHtml(
        response,
        200,
        `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Submitted</title>
    <style>
      :root {
        color-scheme: dark light;
        --bg: #0a0a0b;
        --bg-noise: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='256' height='256' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
        --surface: #141416;
        --surface-border: rgba(255,255,255,0.06);
        --surface-shadow: 0 0 0 1px var(--surface-border), 0 4px 24px rgba(0,0,0,0.4);
        --text-primary: #ededef;
        --text-secondary: #8b8b8e;
        --accent: #7c5cfc;
        --accent-glow: 0 0 20px rgba(124,92,252,0.15);
        --check-bg: var(--accent);
        --check-fg: #fff;
        --mono: ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace;
        --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      }
      @media (prefers-color-scheme: light) {
        :root {
          --bg: #f7f7f8; --bg-noise: none;
          --surface: #ffffff;
          --surface-border: rgba(0,0,0,0.08);
          --surface-shadow: 0 0 0 1px var(--surface-border), 0 4px 24px rgba(0,0,0,0.06);
          --text-primary: #111113; --text-secondary: #6e6e73;
          --accent: #6941e2; --accent-glow: none;
          --check-bg: var(--accent); --check-fg: #fff;
        }
      }
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        min-height: 100vh; padding: 24px; display: grid; place-items: center;
        font-family: var(--sans); background: var(--bg); background-image: var(--bg-noise);
        color: var(--text-primary); -webkit-font-smoothing: antialiased;
      }
      @keyframes appear {
        from { opacity: 0; transform: scale(0.97) translateY(8px); }
        to   { opacity: 1; transform: scale(1) translateY(0); }
      }
      @keyframes checkPop {
        0%   { transform: scale(0) rotate(-12deg); opacity: 0; }
        60%  { transform: scale(1.1) rotate(0deg); }
        100% { transform: scale(1) rotate(0deg); opacity: 1; }
      }
      @keyframes drawCheck { to { stroke-dashoffset: 0; } }
      main {
        max-width: 420px; width: 100%; text-align: center;
        animation: appear 0.25s cubic-bezier(0.16,1,0.3,1) both;
      }
      .card {
        background: var(--surface); border: 1px solid var(--surface-border);
        border-radius: 12px; padding: 48px 36px 40px; box-shadow: var(--surface-shadow);
      }
      .check-icon {
        width: 52px; height: 52px; border-radius: 10px;
        background: var(--check-bg); display: inline-grid; place-items: center;
        margin-bottom: 20px; box-shadow: var(--accent-glow);
        animation: checkPop 0.45s cubic-bezier(0.16,1,0.3,1) 0.1s both;
      }
      .check-icon svg { width: 26px; height: 26px; color: var(--check-fg); }
      .check-icon svg path { stroke-dasharray: 24; stroke-dashoffset: 24; animation: drawCheck 0.3s ease 0.4s forwards; }
      h1 { font-size: 1.125rem; font-weight: 600; letter-spacing: -0.01em; margin-bottom: 6px; }
      p { line-height: 1.6; color: var(--text-secondary); font-size: 13px; }
      .session-id { font-family: var(--mono); font-size: 10px; color: var(--text-secondary); opacity: 0.5; margin-top: 20px; }
    </style>
  </head>
  <body>
    <main>
      <div class="card">
        <div class="check-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1>Response captured</h1>
        <p>You can close this tab and return to the MCP client.</p>
        <p class="session-id" id="countdown">Closing in 3s…</p>
      </div>
    </main>
    <script>
      (function() {
        var seconds = 3;
        var el = document.getElementById('countdown');
        var timer = setInterval(function() {
          seconds--;
          if (seconds <= 0) {
            clearInterval(timer);
            el.textContent = 'Closing…';
            try { window.close(); } catch(e) {}
            setTimeout(function() {
              el.textContent = 'You can close this tab manually.';
            }, 500);
          } else {
            el.textContent = 'Closing in ' + seconds + 's…';
          }
        }, 1000);
      })();
    </script>
  </body>
</html>`,
      );
      return;
    }

    if (!requestUrl.pathname.startsWith("/dialog/")) {
      if (requestUrl.pathname.startsWith("/api/")) {
        await this.handleApiRequest(requestUrl, response);
        return;
      }
      this.respondText(response, 404, "Not found");
      return;
    }

    const dialogId = decodeURIComponent(requestUrl.pathname.slice("/dialog/".length));
    const session = this.sessions.getSession(dialogId);

    if (!session) {
      this.respondText(response, 404, "Unknown dialog");
      return;
    }

    if (method === "GET") {
      this.respondHtml(response, 200, renderDialogPage(session));
      return;
    }

    if (method !== "POST") {
      this.respondText(response, 405, "Method not allowed");
      return;
    }

    const body = await readBody(request);
    const form = new URLSearchParams(body);
    const action = form.get("action") ?? "submit";

    if (action === "cancel") {
      this.sessions.cancel(dialogId);
      this.redirect(response, "/thanks");
      return;
    }

    const values = form.getAll("values");
    const value = form.get("value") ?? undefined;

    try {
      await this.sessions.submit(dialogId, {
        action,
        value,
        values: values.length > 0 ? values : undefined,
      });
      this.redirect(response, "/thanks");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not submit dialog";
      this.respondHtml(
        response,
        422,
        renderDialogPage({
          ...session,
          errorMessage: message,
        }),
      );
    }
  }

  private async handleApiRequest(
    requestUrl: URL,
    response: ServerResponse,
  ): Promise<void> {
    const corsHeaders = {
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    };

    const query = (requestUrl.searchParams.get("q") ?? "").toLowerCase();

    switch (requestUrl.pathname) {
      case "/api/files": {
        const files = await walkFiles(process.cwd(), query, 50);
        response.writeHead(200, corsHeaders);
        response.end(JSON.stringify(files));
        return;
      }
      case "/api/issues": {
        const issues = await searchIssues(query);
        response.writeHead(200, corsHeaders);
        response.end(JSON.stringify(issues));
        return;
      }
      case "/api/commands": {
        const filtered = SLASH_COMMANDS.filter(
          (c) => !query || c.name.toLowerCase().includes(query),
        );
        response.writeHead(200, corsHeaders);
        response.end(JSON.stringify(filtered));
        return;
      }
      case "/api/shortcuts": {
        const filtered = KEYBOARD_SHORTCUTS.filter(
          (s) =>
            !query ||
            s.keys.toLowerCase().includes(query) ||
            s.description.toLowerCase().includes(query),
        );
        response.writeHead(200, corsHeaders);
        response.end(JSON.stringify(filtered));
        return;
      }
      default:
        this.respondText(response, 404, "Unknown API endpoint");
    }
  }

  private respondHtml(
    response: ServerResponse,
    statusCode: number,
    body: string,
  ): void {
    response.writeHead(statusCode, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    });
    response.end(body);
  }

  private respondText(
    response: ServerResponse,
    statusCode: number,
    body: string,
  ): void {
    response.writeHead(statusCode, {
      "content-type": "text/plain; charset=utf-8",
    });
    response.end(body);
  }

  private redirect(response: ServerResponse, location: string): void {
    response.writeHead(303, {
      location,
      "cache-control": "no-store",
    });
    response.end();
  }
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

async function defaultLaunchUrl(url: string): Promise<void> {
  const command = getLaunchCommand(url);
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command.command, command.args, {
      stdio: "ignore",
      detached: false,
    });

    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Browser launcher exited with code ${String(code)}`));
    });
  });
}

function getLaunchCommand(url: string): { command: string; args: string[] } {
  switch (process.platform) {
    case "darwin":
      return { command: "open", args: [url] };
    case "win32":
      return { command: "cmd", args: ["/c", "start", "", url] };
    default:
      return { command: "xdg-open", args: [url] };
  }
}

interface FileResult {
  name: string;
  path: string;
  type: "file" | "dir";
}

async function walkFiles(
  root: string,
  query: string,
  limit: number,
  depth = 0,
): Promise<FileResult[]> {
  if (depth > 5) return [];

  const results: FileResult[] = [];

  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (results.length >= limit) break;
    if (entry.name.startsWith(".")) continue;
    if (IGNORED_DIRS.has(entry.name)) continue;

    const fullPath = join(root, entry.name);
    const relPath = relative(process.cwd(), fullPath);

    if (!query || relPath.toLowerCase().includes(query)) {
      results.push({
        name: entry.name,
        path: relPath,
        type: entry.isDirectory() ? "dir" : "file",
      });
    }

    if (entry.isDirectory() && results.length < limit) {
      const nested = await walkFiles(fullPath, query, limit - results.length, depth + 1);
      results.push(...nested);
    }
  }

  return results.slice(0, limit);
}

interface IssueResult {
  number: number;
  title: string;
  type: "issue" | "pr";
  state: string;
}

async function searchIssues(query: string): Promise<IssueResult[]> {
  try {
    const issues = await ghSearch("issue", query);
    const prs = await ghSearch("pr", query);
    return [...issues, ...prs].slice(0, 20);
  } catch {
    return [];
  }
}

function ghSearch(
  kind: "issue" | "pr",
  query: string,
): Promise<IssueResult[]> {
  return new Promise((resolve) => {
    const args = [
      kind,
      "list",
      "--json",
      "number,title,state",
      "--limit",
      "10",
    ];
    if (query) {
      args.push("--search", query);
    }

    execFile("gh", args, { timeout: 5000 }, (error, stdout) => {
      if (error || !stdout) {
        resolve([]);
        return;
      }

      try {
        const items = JSON.parse(stdout) as Array<{
          number: number;
          title: string;
          state: string;
        }>;

        resolve(
          items.map((item) => ({
            number: item.number,
            title: item.title,
            type: kind === "pr" ? ("pr" as const) : ("issue" as const),
            state: item.state,
          })),
        );
      } catch {
        resolve([]);
      }
    });
  });
}
