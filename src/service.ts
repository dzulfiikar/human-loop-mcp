import type {
  Attachment,
  ChoiceDialogDefinition,
  DialogDefinition,
  DialogResult,
  InputType,
} from "./browser/dialog-session-manager.js";
import type { BrowserDialogHealth } from "./browser/browser-dialog-server.js";

export interface DialogRuntime {
  openDialog(definition: DialogDefinition): Promise<DialogResult>;
  health(): Promise<BrowserDialogHealth>;
}

export interface GetUserInputArgs {
  title: string;
  prompt: string;
  default_value?: string;
  input_type?: InputType;
}

export interface GetUserChoiceArgs {
  title: string;
  prompt: string;
  choices: string[];
  allow_multiple?: boolean;
  default_values?: string[];
}

export interface GetMultilineInputArgs {
  title: string;
  prompt: string;
  default_value?: string;
}

export interface ConfirmationArgs {
  title: string;
  message: string;
  confirm_label?: string;
  cancel_label?: string;
}

export interface InfoArgs {
  title: string;
  message: string;
  acknowledge_label?: string;
}

export class HumanLoopService {
  constructor(private readonly runtime: DialogRuntime) {}

  async getUserInput(args: GetUserInputArgs): Promise<{
    action: DialogResult["action"];
    value: string | null;
  }> {
    const result = await this.runtime.openDialog({
      kind: "input",
      title: args.title,
      prompt: args.prompt,
      inputType: args.input_type ?? "text",
      defaultValue: args.default_value,
    });

    return {
      action: result.action,
      value: "value" in result ? result.value : null,
    };
  }

  async getUserChoice(args: GetUserChoiceArgs): Promise<{
    action: DialogResult["action"];
    selections: string[];
  }> {
    const definition: ChoiceDialogDefinition = {
      kind: "choice",
      title: args.title,
      prompt: args.prompt,
      choices: args.choices,
      allowMultiple: args.allow_multiple ?? false,
      defaultValues: args.default_values,
    };

    const result = await this.runtime.openDialog(definition);

    return {
      action: result.action,
      selections: "values" in result ? result.values : [],
    };
  }

  async getMultilineInput(args: GetMultilineInputArgs): Promise<{
    action: DialogResult["action"];
    value: string | null;
    attachments?: Attachment[];
  }> {
    const result = await this.runtime.openDialog({
      kind: "multiline",
      title: args.title,
      prompt: args.prompt,
      defaultValue: args.default_value,
    });

    return {
      action: result.action,
      value: "value" in result ? result.value : null,
      attachments: "attachments" in result ? result.attachments : undefined,
    };
  }

  async showConfirmationDialog(args: ConfirmationArgs): Promise<{ confirmed: boolean }> {
    const result = await this.runtime.openDialog({
      kind: "confirmation",
      title: args.title,
      prompt: args.message,
      confirmLabel: args.confirm_label,
      cancelLabel: args.cancel_label,
    });

    return {
      confirmed: result.action === "confirm",
    };
  }

  async showInfoMessage(args: InfoArgs): Promise<{ acknowledged: boolean }> {
    const result = await this.runtime.openDialog({
      kind: "info",
      title: args.title,
      prompt: args.message,
      acknowledgeLabel: args.acknowledge_label,
    });

    return {
      acknowledged: result.action === "acknowledge",
    };
  }

  async getHumanLoopPrompt(): Promise<{ guidance: string }> {
    return {
      guidance:
        "Use these tools when the model needs a human decision, text input, confirmation, or a longer free-form response. The browser will open a localhost page for the user to complete.",
    };
  }

  async healthCheck(): Promise<{
    status: BrowserDialogHealth["status"];
    gui_available: boolean;
    server_name: string;
    platform: NodeJS.Platform;
    base_url: string | null;
    tools_available: string[];
  }> {
    const health = await this.runtime.health();

    return {
      status: health.status,
      gui_available: health.guiAvailable,
      server_name: "Human Loop MCP",
      platform: process.platform,
      base_url: health.baseUrl,
      tools_available: [
        "get_user_input",
        "get_user_choice",
        "get_multiline_input",
        "show_confirmation_dialog",
        "show_info_message",
        "get_human_loop_prompt",
      ],
    };
  }
}
