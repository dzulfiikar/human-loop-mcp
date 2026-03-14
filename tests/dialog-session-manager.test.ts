import { describe, expect, it } from "vitest";

import {
  DialogSessionManager,
  type ChoiceDialogDefinition,
  type InputDialogDefinition,
  type MultilineDialogDefinition,
  type Attachment,
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

  it("resolves a multiline response with attachments", async () => {
    const manager = new DialogSessionManager();
    const definition: MultilineDialogDefinition = {
      kind: "multiline",
      title: "Upload",
      prompt: "Describe and attach files",
    };

    const session = manager.createSession(definition);
    const resultPromise = session.result;

    const attachments: Attachment[] = [
      { name: "readme.txt", type: "text/plain", size: 13, data: "SGVsbG8gV29ybGQh" },
    ];

    await manager.submit(session.id, {
      value: "Here is the file",
      attachments,
    });

    await expect(resultPromise).resolves.toEqual({
      action: "submit",
      value: "Here is the file",
      attachments,
    });
  });

  it("omits attachments from multiline result when none provided", async () => {
    const manager = new DialogSessionManager();
    const definition: MultilineDialogDefinition = {
      kind: "multiline",
      title: "Notes",
      prompt: "Write something",
    };

    const session = manager.createSession(definition);
    const resultPromise = session.result;

    await manager.submit(session.id, { value: "just text" });

    const result = await resultPromise;
    expect(result).toEqual({ action: "submit", value: "just text" });
    expect("attachments" in result).toBe(false);
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

  it("renders attachment UI for multiline dialogs", () => {
    const definition: MultilineDialogDefinition = {
      kind: "multiline",
      title: "Upload test",
      prompt: "Attach something",
    };

    const html = renderDialogPage({
      id: "dlg_789",
      definition,
      errorMessage: undefined,
    });

    expect(html).toContain('id="attach-zone"');
    expect(html).toContain('id="attach-btn"');
    expect(html).toContain('id="file-input"');
    expect(html).toContain('id="attach-chips"');
    expect(html).toContain('name="attachments"');
    expect(html).toContain("drag &amp; drop");
  });
});
