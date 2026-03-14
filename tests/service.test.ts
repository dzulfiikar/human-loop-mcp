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
});
