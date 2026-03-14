import { describe, expect, it } from "vitest";

import {
  DialogSessionManager,
  type ChoiceDialogDefinition,
  type InputDialogDefinition,
  type MultilineDialogDefinition,
} from "../src/browser/dialog-session-manager.js";
import { renderDialogPage } from "../src/browser/html.js";

describe("DialogSessionManager", () => {
  it("creates a session and resolves a text response", async () => {
    const manager = new DialogSessionManager();
    const definition: InputDialogDefinition = {
      kind: "input",
      title: "Input",
      prompt: "Enter your name",
      inputType: "text",
      defaultValue: "apple",
    };

    const session = manager.createSession(definition);
    const pending = manager.getSession(session.id);

    expect(pending?.definition.prompt).toBe("Enter your name");

    const resultPromise = session.result;
    await manager.submit(session.id, { value: "banana" });

    await expect(resultPromise).resolves.toEqual({
      action: "submit",
      value: "banana",
    });
  });

  it("rejects invalid integer input", async () => {
    const manager = new DialogSessionManager();
    const definition: InputDialogDefinition = {
      kind: "input",
      title: "Age",
      prompt: "Enter age",
      inputType: "integer",
    };

    const session = manager.createSession(definition);

    await expect(
      manager.submit(session.id, { value: "abc" }),
    ).rejects.toThrow("Expected an integer");
  });
});

describe("renderDialogPage", () => {
  it("renders a textarea for multiline dialogs", () => {
    const definition: MultilineDialogDefinition = {
      kind: "multiline",
      title: "Notes",
      prompt: "Write details",
      defaultValue: "hello",
    };

    const html = renderDialogPage({
      id: "dlg_123",
      definition,
      errorMessage: undefined,
    });

    expect(html).toContain("<textarea");
    expect(html).toContain("Write details");
    expect(html).toContain("hello");
  });

  it("renders checkboxes for multi-select choice dialogs", () => {
    const definition: ChoiceDialogDefinition = {
      kind: "choice",
      title: "Pick tools",
      prompt: "Select one or more",
      allowMultiple: true,
      choices: ["alpha", "beta", "gamma"],
    };

    const html = renderDialogPage({
      id: "dlg_456",
      definition,
      errorMessage: undefined,
    });

    expect(html).toContain('type="checkbox"');
    expect(html).toContain("alpha");
    expect(html).toContain("beta");
  });
});
