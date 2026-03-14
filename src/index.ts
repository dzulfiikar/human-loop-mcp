#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { BrowserDialogServer } from "./browser/browser-dialog-server.js";
import { HumanLoopService } from "./service.js";

const TOOL_NAMES = [
  "get_user_input",
  "get_user_choice",
  "get_multiline_input",
  "show_confirmation_dialog",
  "show_info_message",
  "get_human_loop_prompt",
  "health_check",
] as const;

export async function createServer(): Promise<McpServer> {
  const host = process.env["HITL_HOST"] ?? "127.0.0.1";
  const port = process.env["HITL_PORT"] ? parseInt(process.env["HITL_PORT"], 10) : undefined;
  const noLaunch = process.env["HITL_NO_LAUNCH"] === "1" || process.env["HITL_NO_LAUNCH"] === "true";

  const dialogRuntime = new BrowserDialogServer({
    host,
    port,
    launchUrl: noLaunch
      ? async (url) => { process.stderr.write(`\n🔗 Open dialog: ${url}\n`); }
      : undefined,
  });
  const service = new HumanLoopService(dialogRuntime);

  const server = new McpServer({
    name: "human-loop-mcp-ts",
    version: "0.1.0",
  });

  server.registerTool(
    "get_user_input",
    {
      description: "Open a browser-based single-line input dialog for the user.",
      inputSchema: {
        title: z.string(),
        prompt: z.string(),
        default_value: z.string().optional(),
        input_type: z.enum(["text", "password", "integer", "float"]).optional(),
      },
    },
    async (args) => toolResult(await service.getUserInput(args)),
  );

  server.registerTool(
    "get_user_choice",
    {
      description: "Open a browser-based choice dialog for the user.",
      inputSchema: {
        title: z.string(),
        prompt: z.string(),
        choices: z.array(z.string()).min(1),
        allow_multiple: z.boolean().optional(),
        default_values: z.array(z.string()).optional(),
      },
    },
    async (args) => toolResult(await service.getUserChoice(args)),
  );

  server.registerTool(
    "get_multiline_input",
    {
      description: "Open a browser-based multiline text dialog for the user.",
      inputSchema: {
        title: z.string(),
        prompt: z.string(),
        default_value: z.string().optional(),
      },
    },
    async (args) => toolResult(await service.getMultilineInput(args)),
  );

  server.registerTool(
    "show_confirmation_dialog",
    {
      description: "Ask the user to confirm or cancel an action in the browser.",
      inputSchema: {
        title: z.string(),
        message: z.string(),
        confirm_label: z.string().optional(),
        cancel_label: z.string().optional(),
      },
    },
    async (args) => toolResult(await service.showConfirmationDialog(args)),
  );

  server.registerTool(
    "show_info_message",
    {
      description: "Show an informational browser page and wait for acknowledgement.",
      inputSchema: {
        title: z.string(),
        message: z.string(),
        acknowledge_label: z.string().optional(),
      },
    },
    async (args) => toolResult(await service.showInfoMessage(args)),
  );

  server.registerTool(
    "get_human_loop_prompt",
    {
      description: "Explain when to use the human-loop browser tools.",
    },
    async () => toolResult(await service.getHumanLoopPrompt()),
  );

  server.registerTool(
    "health_check",
    {
      description: "Check server and browser dialog runtime health.",
    },
    async () => toolResult(await service.healthCheck()),
  );

  const closeRuntime = async () => {
    await dialogRuntime.close();
  };

  process.once("SIGINT", () => {
    void closeRuntime().finally(() => process.exit(0));
  });
  process.once("SIGTERM", () => {
    void closeRuntime().finally(() => process.exit(0));
  });

  return server;
}

export async function start(): Promise<void> {
  const server = await createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void start().catch((error: unknown) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}

function toolResult(payload: Record<string, unknown>) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(payload),
      },
    ],
    structuredContent: payload,
  };
}

export { TOOL_NAMES };
