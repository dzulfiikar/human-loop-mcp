import { describe, expect, it, vi } from "vitest";

import { HumanLoopService } from "../src/service.js";

describe("HumanLoopService", () => {
  it("maps user choice requests onto a choice dialog", async () => {
    const runtime = {
      openDialog: vi.fn(async () => ({
        action: "submit" as const,
        values: ["alpha", "gamma"],
      })),
      health: vi.fn(async () => ({
        status: "healthy" as const,
        guiAvailable: true,
        baseUrl: "http://127.0.0.1:3123",
      })),
    };

    const service = new HumanLoopService(runtime);

    const result = await service.getUserChoice({
      title: "Pick",
      prompt: "Choose tools",
      choices: ["alpha", "beta", "gamma"],
      allow_multiple: true,
    });

    expect(runtime.openDialog).toHaveBeenCalledWith({
      kind: "choice",
      title: "Pick",
      prompt: "Choose tools",
      choices: ["alpha", "beta", "gamma"],
      allowMultiple: true,
      defaultValues: undefined,
    });
    expect(result).toEqual({
      action: "submit",
      selections: ["alpha", "gamma"],
    });
  });

  it("reports health using the browser runtime state", async () => {
    const runtime = {
      openDialog: vi.fn(),
      health: vi.fn(async () => ({
        status: "healthy" as const,
        guiAvailable: true,
        baseUrl: "http://127.0.0.1:3123",
      })),
    };

    const service = new HumanLoopService(runtime);

    await expect(service.healthCheck()).resolves.toEqual(
      expect.objectContaining({
        status: "healthy",
        gui_available: true,
        server_name: "Human Loop MCP TS",
      }),
    );
  });

  it("forwards attachments from multiline dialog result", async () => {
    const attachments = [
      { name: "file.png", type: "image/png", size: 1024, data: "iVBORw0KGgo=" },
    ];

    const runtime = {
      openDialog: vi.fn(async () => ({
        action: "submit" as const,
        value: "see attached",
        attachments,
      })),
      health: vi.fn(),
    };

    const service = new HumanLoopService(runtime);

    const result = await service.getMultilineInput({
      title: "Upload",
      prompt: "Attach files",
    });

    expect(result).toEqual({
      action: "submit",
      value: "see attached",
      attachments,
    });
  });

  it("omits attachments when multiline has none", async () => {
    const runtime = {
      openDialog: vi.fn(async () => ({
        action: "submit" as const,
        value: "no files",
      })),
      health: vi.fn(),
    };

    const service = new HumanLoopService(runtime);

    const result = await service.getMultilineInput({
      title: "Notes",
      prompt: "Write something",
    });

    expect(result).toEqual({
      action: "submit",
      value: "no files",
      attachments: undefined,
    });
  });
});
