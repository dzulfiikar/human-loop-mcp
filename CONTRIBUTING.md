# Contributing

Thanks for your interest in contributing to **human-loop-mcp**!

## Development Setup

```bash
git clone https://github.com/dzulfiikar/human-loop-mcp.git
cd human-loop-mcp
npm install
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run from source with tsx (hot-reload) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm test` | Run test suite (Vitest) |
| `npm run typecheck` | Type-check without emitting |

## Workflow

1. **Fork** the repo and create a feature branch from `main`
2. Make your changes
3. Run `npm test && npm run typecheck` — both must pass
4. Commit with a clear message describing the change
5. Open a **Pull Request** against `main`

## Code Style

- TypeScript strict mode — no `any` unless absolutely necessary
- ES modules (`import/export`, `.js` extensions in imports)
- Prefer pure functions and explicit types
- Minimal comments — code should be self-documenting

## Testing

Tests live in `tests/` and use [Vitest](https://vitest.dev/). When adding new features:
- Add unit tests for business logic (`service.ts`, `dialog-session-manager.ts`)
- Integration tests for HTTP behavior (`browser-dialog-server.test.ts`)

## Architecture

```
src/
├── index.ts                    MCP server & tool registration
├── service.ts                  Business logic layer
└── browser/
    ├── browser-dialog-server.ts   HTTP server & browser launcher
    ├── dialog-session-manager.ts  Session lifecycle & validation
    └── html.ts                    HTML/CSS/JS dialog renderer
```

Each layer has a clear responsibility — keep them separated.

## Reporting Issues

Open a [GitHub Issue](https://github.com/dzulfiikar/human-loop-mcp/issues) with:
- Steps to reproduce
- Expected vs actual behavior
- Node.js version and OS
