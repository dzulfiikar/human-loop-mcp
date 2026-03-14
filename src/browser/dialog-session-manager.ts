import { randomUUID } from "node:crypto";

export type InputType = "text" | "password" | "integer" | "float";

interface BaseDialogDefinition {
  title: string;
  prompt: string;
}

export interface InputDialogDefinition extends BaseDialogDefinition {
  kind: "input";
  inputType: InputType;
  defaultValue?: string;
}

export interface MultilineDialogDefinition extends BaseDialogDefinition {
  kind: "multiline";
  defaultValue?: string;
}

export interface ChoiceDialogDefinition extends BaseDialogDefinition {
  kind: "choice";
  choices: string[];
  allowMultiple: boolean;
  defaultValues?: string[];
}

export interface ConfirmationDialogDefinition extends BaseDialogDefinition {
  kind: "confirmation";
  confirmLabel?: string;
  cancelLabel?: string;
}

export interface InfoDialogDefinition extends BaseDialogDefinition {
  kind: "info";
  acknowledgeLabel?: string;
}

export type DialogDefinition =
  | InputDialogDefinition
  | MultilineDialogDefinition
  | ChoiceDialogDefinition
  | ConfirmationDialogDefinition
  | InfoDialogDefinition;

export type DialogResult =
  | { action: "submit"; value: string }
  | { action: "submit"; values: string[] }
  | { action: "confirm" }
  | { action: "cancel" }
  | { action: "acknowledge" };

export interface DialogSubmission {
  action?: string;
  value?: string;
  values?: string[];
}

export interface PendingDialogSession {
  id: string;
  definition: DialogDefinition;
  createdAt: Date;
  errorMessage?: string;
}

interface StoredDialogSession extends PendingDialogSession {
  resolve: (result: DialogResult) => void;
  reject: (error: Error) => void;
}

export interface CreatedDialogSession extends PendingDialogSession {
  result: Promise<DialogResult>;
}

export class DialogSessionManager {
  private readonly sessions = new Map<string, StoredDialogSession>();

  createSession(definition: DialogDefinition): CreatedDialogSession {
    const id = `dlg_${randomUUID()}`;

    let resolve!: (result: DialogResult) => void;
    let reject!: (error: Error) => void;

    const result = new Promise<DialogResult>((promiseResolve, promiseReject) => {
      resolve = promiseResolve;
      reject = promiseReject;
    });

    const session: StoredDialogSession = {
      id,
      definition,
      createdAt: new Date(),
      resolve,
      reject,
    };

    this.sessions.set(id, session);

    return {
      id: session.id,
      definition: session.definition,
      createdAt: session.createdAt,
      errorMessage: session.errorMessage,
      result,
    };
  }

  getSession(id: string): PendingDialogSession | undefined {
    const session = this.sessions.get(id);

    if (!session) {
      return undefined;
    }

    return {
      id: session.id,
      definition: session.definition,
      createdAt: session.createdAt,
      errorMessage: session.errorMessage,
    };
  }

  async submit(id: string, submission: DialogSubmission): Promise<DialogResult> {
    const session = this.sessions.get(id);

    if (!session) {
      throw new Error(`Unknown dialog session: ${id}`);
    }

    const result = this.validateSubmission(session.definition, submission);
    this.sessions.delete(id);
    session.resolve(result);

    return result;
  }

  cancel(id: string): DialogResult {
    const session = this.sessions.get(id);

    if (!session) {
      throw new Error(`Unknown dialog session: ${id}`);
    }

    this.sessions.delete(id);
    const result: DialogResult = { action: "cancel" };
    session.resolve(result);
    return result;
  }

  fail(id: string, error: Error): void {
    const session = this.sessions.get(id);

    if (!session) {
      return;
    }

    this.sessions.delete(id);
    session.reject(error);
  }

  private validateSubmission(
    definition: DialogDefinition,
    submission: DialogSubmission,
  ): DialogResult {
    switch (definition.kind) {
      case "input":
        return this.validateInput(definition, submission);
      case "multiline":
        return {
          action: "submit",
          value: submission.value ?? "",
        };
      case "choice":
        return this.validateChoice(definition, submission);
      case "confirmation":
        return submission.action === "confirm"
          ? { action: "confirm" }
          : { action: "cancel" };
      case "info":
        return { action: "acknowledge" };
      default:
        return assertNever(definition);
    }
  }

  private validateInput(
    definition: InputDialogDefinition,
    submission: DialogSubmission,
  ): DialogResult {
    const value = submission.value ?? "";

    switch (definition.inputType) {
      case "integer":
        if (!/^-?\d+$/.test(value)) {
          throw new Error("Expected an integer");
        }
        break;
      case "float":
        if (Number.isNaN(Number(value)) || value.trim() === "") {
          throw new Error("Expected a float");
        }
        break;
      case "password":
      case "text":
        break;
      default:
        assertNever(definition.inputType);
    }

    return {
      action: "submit",
      value,
    };
  }

  private validateChoice(
    definition: ChoiceDialogDefinition,
    submission: DialogSubmission,
  ): DialogResult {
    const values = submission.values ?? (submission.value ? [submission.value] : []);

    if (!definition.allowMultiple && values.length > 1) {
      throw new Error("Expected a single selection");
    }

    const invalidChoice = values.find(
      (value) => !definition.choices.includes(value),
    );

    if (invalidChoice) {
      throw new Error(`Unknown choice: ${invalidChoice}`);
    }

    return {
      action: "submit",
      values,
    };
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`);
}
