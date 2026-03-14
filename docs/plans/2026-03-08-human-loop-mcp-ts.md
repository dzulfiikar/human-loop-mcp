# Human Loop MCP TS Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a TypeScript replacement for the Python human-in-the-loop MCP server that works reliably on macOS by using browser-based dialogs instead of native Python/Tk windows.

**Architecture:** A stdio MCP server exposes the existing core tool names and starts a small localhost HTTP server on demand. Each tool call creates a short-lived dialog session, opens the user's default browser to a local page, waits for form submission, and then returns structured data back through MCP.

**Tech Stack:** TypeScript, Node.js, `@modelcontextprotocol/sdk`, built-in `http`, Vitest

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.build.json`
- Create: `.gitignore`

**Step 1: Write the failing test**

Create tests that import the planned browser session manager and HTML renderer.

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because the implementation does not exist yet.

**Step 3: Write minimal implementation**

Create the browser dialog primitives and type definitions.

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS for the initial browser session and HTML tests.

**Step 5: Commit**

```bash
git add .
git commit -m "feat: scaffold TypeScript human loop MCP server"
```

### Task 2: Browser Dialog Runtime

**Files:**
- Create: `src/browser/dialog-session-manager.ts`
- Create: `src/browser/html.ts`
- Create: `src/browser/types.ts`
- Create: `src/browser/browser-dialog-server.ts`
- Test: `tests/dialog-session-manager.test.ts`

**Step 1: Write the failing test**

Add tests for session creation, submission, validation, and rendered dialog HTML.

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/dialog-session-manager.test.ts`
Expected: FAIL on missing behavior.

**Step 3: Write minimal implementation**

Implement session storage, resolution, validation, and HTML rendering.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/dialog-session-manager.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add browser dialog runtime"
```

### Task 3: MCP Tool Layer

**Files:**
- Create: `src/index.ts`
- Create: `src/tools.ts`
- Test: `tests/tools.test.ts`

**Step 1: Write the failing test**

Define tests for the core tool contract and health output.

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/tools.test.ts`
Expected: FAIL until the tool handlers exist.

**Step 3: Write minimal implementation**

Implement the MCP server, tool registration, health endpoint behavior, and browser-launch integration.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/tools.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add MCP tool handlers"
```

### Task 4: Docs and Verification

**Files:**
- Create: `README.md`

**Step 1: Write the failing test**

No automated doc test. Use build and integration verification instead.

**Step 2: Run test to verify it fails**

Run a manual stdio probe before final polish.

**Step 3: Write minimal implementation**

Document setup, client config, and the browser-based behavior.

**Step 4: Run test to verify it passes**

Run:
- `npm test`
- `npm run build`
- manual stdio initialize + tool call probe

Expected: all commands succeed.

**Step 5: Commit**

```bash
git add .
git commit -m "docs: add usage guide for TypeScript human loop MCP server"
```
