import { afterEach, describe, expect, it } from "vitest";

import { BrowserDialogServer } from "../src/browser/browser-dialog-server.js";

describe("BrowserDialogServer", () => {
  const activeServers: BrowserDialogServer[] = [];

  afterEach(async () => {
    while (activeServers.length > 0) {
      const server = activeServers.pop();
      if (server) {
        await server.close();
      }
    }
  });

  it("serves a dialog page and resolves submitted form data", async () => {
    let openedUrl = "";
    const server = new BrowserDialogServer({
      launchUrl: async (url) => {
        openedUrl = url;
      },
    });
    activeServers.push(server);

    const resultPromise = server.openDialog({
      kind: "input",
      title: "Who are you?",
      prompt: "Enter your display name",
      inputType: "text",
      defaultValue: "apple",
    });

    await waitFor(() => openedUrl.length > 0);

    const pageResponse = await fetch(openedUrl);
    expect(pageResponse.status).toBe(200);
    expect(await pageResponse.text()).toContain("Enter your display name");

    const submitResponse = await fetch(openedUrl, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        action: "submit",
        value: "banana",
      }),
      redirect: "manual",
    });

    expect(submitResponse.status).toBe(303);
    await expect(resultPromise).resolves.toEqual({
      action: "submit",
      value: "banana",
    });
  });

  it("resolves multiline submission with attachments", async () => {
    let openedUrl = "";
    const server = new BrowserDialogServer({
      launchUrl: async (url) => {
        openedUrl = url;
      },
    });
    activeServers.push(server);

    const resultPromise = server.openDialog({
      kind: "multiline",
      title: "Upload test",
      prompt: "Attach files here",
    });

    await waitFor(() => openedUrl.length > 0);

    const attachments = JSON.stringify([
      { name: "test.txt", type: "text/plain", size: 5, data: "aGVsbG8=" },
    ]);

    const submitResponse = await fetch(openedUrl, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        action: "submit",
        value: "see attached",
        attachments,
      }),
      redirect: "manual",
    });

    expect(submitResponse.status).toBe(303);
    const result = await resultPromise;
    expect(result).toEqual({
      action: "submit",
      value: "see attached",
      attachments: [
        { name: "test.txt", type: "text/plain", size: 5, data: "aGVsbG8=" },
      ],
    });
  });
});

async function waitFor(predicate: () => boolean, timeoutMs = 1000): Promise<void> {
  const startedAt = Date.now();

  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error("Timed out waiting for condition");
    }

    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
