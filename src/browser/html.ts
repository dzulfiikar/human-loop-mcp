import type { DialogDefinition } from "./dialog-session-manager.js";

export interface DialogPageModel {
  id: string;
  definition: DialogDefinition;
  errorMessage?: string;
}

const DIALOG_ICONS: Record<DialogDefinition["kind"], string> = {
  input: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>`,
  multiline: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>`,
  choice: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>`,
  confirmation: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>`,
  info: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="16" y2="12"/><line x1="12" x2="12.01" y1="8" y2="8"/></svg>`,
};

const KIND_LABELS: Record<DialogDefinition["kind"], string> = {
  input: "INPUT",
  multiline: "TEXT",
  choice: "SELECT",
  confirmation: "CONFIRM",
  info: "INFO",
};

export function renderDialogPage(session: DialogPageModel): string {
  const { definition, errorMessage, id } = session;

  const icon = DIALOG_ICONS[definition.kind];
  const kindLabel = KIND_LABELS[definition.kind];

  const formBody = (() => {
    switch (definition.kind) {
      case "input":
        return `
          <label class="field">
            <span class="field-label">response</span>
            <input
              id="main-input"
              autofocus
              name="value"
              type="${mapInputType(definition.inputType)}"
              placeholder="${definition.inputType === "integer" ? "Enter a number…" : definition.inputType === "float" ? "Enter a decimal…" : "Type here…"}"
              value="${escapeHtml(definition.defaultValue ?? "")}"
            />
          </label>
        `;
      case "multiline":
        return `
          <label class="field">
            <span class="field-label">response</span>
            <textarea
              id="main-input"
              name="value"
              rows="10"
              autofocus
              placeholder="Type here… (use @ for files, # for issues, / for commands)"
            >${escapeHtml(definition.defaultValue ?? "")}</textarea>
            <span class="field-hint">⌘Enter submit · Esc cancel · @ # / ? autocomplete</span>
          </label>
        `;
      case "choice":
        return `
          <fieldset class="choices">
            <legend class="field-label">${definition.allowMultiple ? "select one or more" : "select one"}</legend>
            ${definition.choices
              .map((choice, index) => {
                const checked = definition.defaultValues?.includes(choice)
                  ? ' checked="checked"'
                  : "";
                const inputType = definition.allowMultiple ? "checkbox" : "radio";
                const fieldName = definition.allowMultiple ? "values" : "value";
                return `
                  <label class="choice" tabindex="-1">
                    <input
                      ${index === 0 ? "autofocus" : ""}
                      name="${fieldName}"
                      type="${inputType}"
                      value="${escapeHtml(choice)}"${checked}
                    />
                    <span class="choice-indicator"></span>
                    <span class="choice-text">${escapeHtml(choice)}</span>
                  </label>
                `;
              })
              .join("")}
          </fieldset>
        `;
      case "confirmation":
      case "info":
        return "";
      default:
        return assertNever(definition);
    }
  })();

  const actions = (() => {
    switch (definition.kind) {
      case "confirmation":
        return `
          <div class="actions">
            <button type="submit" name="action" value="cancel" form="dialog-form" class="btn btn-ghost">
              ${escapeHtml(definition.cancelLabel ?? "Cancel")}
              <kbd class="btn-hint">Esc</kbd>
            </button>
            <button type="submit" name="action" value="confirm" form="dialog-form" class="btn btn-primary">
              ${escapeHtml(definition.confirmLabel ?? "Confirm")}
              <kbd class="btn-hint">↵</kbd>
            </button>
          </div>
        `;
      case "info":
        return `
          <div class="actions">
            <button type="submit" name="action" value="acknowledge" form="dialog-form" class="btn btn-primary">
              ${escapeHtml(definition.acknowledgeLabel ?? "OK")}
              <kbd class="btn-hint">↵</kbd>
            </button>
          </div>
        `;
      default:
        return `
          <div class="actions">
            <button type="submit" name="action" value="cancel" form="dialog-form" class="btn btn-ghost">
              Cancel
              <kbd class="btn-hint">Esc</kbd>
            </button>
            <button type="submit" name="action" value="submit" form="dialog-form" class="btn btn-primary">
              Submit
              <kbd class="btn-hint">⌘↵</kbd>
            </button>
          </div>
        `;
    }
  })();

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(definition.title)}</title>
    <style>
      :root {
        color-scheme: dark light;

        --bg: #0a0a0b;
        --bg-noise: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='256' height='256' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
        --surface: #141416;
        --surface-hover: #1a1a1e;
        --surface-border: rgba(255, 255, 255, 0.06);
        --surface-border-strong: rgba(255, 255, 255, 0.1);
        --surface-shadow: 0 0 0 1px var(--surface-border), 0 4px 24px rgba(0, 0, 0, 0.4);

        --text-primary: #ededef;
        --text-secondary: #8b8b8e;
        --text-tertiary: #5a5a5d;

        --accent: #7c5cfc;
        --accent-hover: #9179ff;
        --accent-subtle: rgba(124, 92, 252, 0.12);
        --accent-glow: 0 0 20px rgba(124, 92, 252, 0.15);

        --input-bg: #0f0f11;
        --input-border: rgba(255, 255, 255, 0.08);
        --input-focus-border: var(--accent);
        --input-focus-ring: rgba(124, 92, 252, 0.2);
        --input-placeholder: #4a4a4d;

        --choice-bg: rgba(255, 255, 255, 0.02);
        --choice-hover: rgba(255, 255, 255, 0.05);
        --choice-active: rgba(124, 92, 252, 0.08);
        --choice-active-border: rgba(124, 92, 252, 0.35);
        --indicator-bg: transparent;
        --indicator-border: rgba(255, 255, 255, 0.2);
        --indicator-active: var(--accent);

        --ghost-hover: rgba(255, 255, 255, 0.05);
        --danger: #f55;
        --danger-bg: rgba(255, 85, 85, 0.08);
        --danger-border: rgba(255, 85, 85, 0.15);

        --kbd-bg: rgba(255, 255, 255, 0.06);
        --kbd-border: rgba(255, 255, 255, 0.08);
        --kbd-text: #5a5a5d;

        --badge-bg: rgba(124, 92, 252, 0.1);
        --badge-text: var(--accent);

        --mono: ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
        --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        --radius-sm: 6px;
        --radius: 8px;
        --radius-lg: 12px;
      }

      @media (prefers-color-scheme: light) {
        :root {
          --bg: #f7f7f8;
          --bg-noise: none;
          --surface: #ffffff;
          --surface-hover: #f0f0f2;
          --surface-border: rgba(0, 0, 0, 0.08);
          --surface-border-strong: rgba(0, 0, 0, 0.14);
          --surface-shadow: 0 0 0 1px var(--surface-border), 0 4px 24px rgba(0, 0, 0, 0.06);
          --text-primary: #111113;
          --text-secondary: #6e6e73;
          --text-tertiary: #aeaeb2;
          --accent: #6941e2;
          --accent-hover: #5a35c5;
          --accent-subtle: rgba(105, 65, 226, 0.06);
          --accent-glow: none;
          --input-bg: #f7f7f8;
          --input-border: rgba(0, 0, 0, 0.1);
          --input-focus-border: var(--accent);
          --input-focus-ring: rgba(105, 65, 226, 0.15);
          --input-placeholder: #c7c7cc;
          --choice-bg: rgba(0, 0, 0, 0.02);
          --choice-hover: rgba(0, 0, 0, 0.04);
          --choice-active: rgba(105, 65, 226, 0.06);
          --choice-active-border: rgba(105, 65, 226, 0.35);
          --indicator-bg: #ffffff;
          --indicator-border: rgba(0, 0, 0, 0.2);
          --indicator-active: var(--accent);
          --ghost-hover: rgba(0, 0, 0, 0.05);
          --danger: #e53535;
          --danger-bg: rgba(229, 53, 53, 0.06);
          --danger-border: rgba(229, 53, 53, 0.12);
          --kbd-bg: rgba(0, 0, 0, 0.04);
          --kbd-border: rgba(0, 0, 0, 0.08);
          --kbd-text: #aeaeb2;
          --badge-bg: rgba(105, 65, 226, 0.08);
          --badge-text: var(--accent);
        }
      }

      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      body {
        min-height: 100vh;
        padding: max(20px, env(safe-area-inset-top, 20px))
                 max(20px, env(safe-area-inset-right, 20px))
                 max(20px, env(safe-area-inset-bottom, 20px))
                 max(20px, env(safe-area-inset-left, 20px));
        display: grid;
        place-items: center;
        font-family: var(--sans);
        font-size: 14px;
        background: var(--bg);
        background-image: var(--bg-noise);
        color: var(--text-primary);
        -webkit-font-smoothing: antialiased;
        line-height: 1.5;
      }

      @keyframes appear {
        from { opacity: 0; transform: scale(0.97) translateY(8px); }
        to   { opacity: 1; transform: scale(1) translateY(0); }
      }

      .shell { width: 100%; max-width: 520px; animation: appear 0.25s cubic-bezier(0.16, 1, 0.3, 1) both; }

      .card {
        background: var(--surface);
        border: 1px solid var(--surface-border);
        border-radius: var(--radius-lg);
        box-shadow: var(--surface-shadow);
        overflow: hidden;
      }

      .card-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px 20px;
        border-bottom: 1px solid var(--surface-border);
      }

      .card-icon { flex-shrink: 0; color: var(--accent); display: flex; }

      .card-badge {
        font-family: var(--mono);
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.08em;
        color: var(--badge-text);
        background: var(--badge-bg);
        padding: 2px 6px;
        border-radius: 4px;
      }

      .card-title {
        flex: 1;
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .card-body { padding: 20px; }

      .prompt-text {
        font-size: 14px;
        line-height: 1.65;
        color: var(--text-secondary);
        white-space: pre-wrap;
        word-wrap: break-word;
        margin-bottom: 20px;
      }

      form { display: grid; gap: 16px; }
      .field { display: grid; gap: 6px; }

      .field-label {
        font-family: var(--mono);
        font-size: 11px;
        font-weight: 500;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--text-tertiary);
      }

      .field-hint {
        font-family: var(--mono);
        font-size: 11px;
        color: var(--text-tertiary);
        margin-top: 2px;
      }

      .choices { border: 0; display: grid; gap: 4px; }
      .choices .field-label { margin-bottom: 4px; }

      input:not([type="radio"]):not([type="checkbox"]),
      textarea {
        width: 100%;
        padding: 10px 12px;
        border-radius: var(--radius);
        border: 1px solid var(--input-border);
        background: var(--input-bg);
        color: var(--text-primary);
        font-family: var(--mono);
        font-size: 13px;
        outline: none;
        transition: border-color 0.12s, box-shadow 0.12s;
      }

      input::placeholder, textarea::placeholder {
        color: var(--input-placeholder);
        font-family: var(--mono);
      }

      input:not([type="radio"]):not([type="checkbox"]):focus,
      textarea:focus {
        border-color: var(--input-focus-border);
        box-shadow: 0 0 0 3px var(--input-focus-ring), var(--accent-glow);
      }

      textarea {
        resize: vertical;
        min-height: 180px;
        line-height: 1.65;
        font-family: var(--sans);
        font-size: 14px;
      }

      .choice {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        border-radius: var(--radius);
        border: 1px solid var(--surface-border);
        background: var(--choice-bg);
        cursor: pointer;
        transition: all 0.1s ease;
        user-select: none;
      }

      .choice:hover { background: var(--choice-hover); border-color: var(--surface-border-strong); }
      .choice:has(input:checked) { background: var(--choice-active); border-color: var(--choice-active-border); }
      .choice:has(input:focus-visible) { outline: 2px solid var(--accent); outline-offset: -1px; }

      .choice input[type="radio"],
      .choice input[type="checkbox"] {
        position: absolute; opacity: 0; width: 0; height: 0; pointer-events: none;
      }

      .choice-indicator {
        flex-shrink: 0;
        width: 16px;
        height: 16px;
        border: 1.5px solid var(--indicator-border);
        background: var(--indicator-bg);
        transition: all 0.1s ease;
        display: grid;
        place-items: center;
      }

      .choice input[type="radio"] + .choice-indicator { border-radius: 50%; }
      .choice input[type="checkbox"] + .choice-indicator { border-radius: 3px; }
      .choice input:checked + .choice-indicator { border-color: var(--indicator-active); background: var(--indicator-active); }
      .choice input[type="radio"]:checked + .choice-indicator { background: transparent; border-width: 5px; }

      .choice input[type="checkbox"]:checked + .choice-indicator::after {
        content: "";
        display: block;
        width: 10px;
        height: 10px;
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2.5 6.5L5 9l4.5-6' stroke='white' stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
        background-size: contain;
        background-repeat: no-repeat;
      }

      .choice-text { font-size: 13px; line-height: 1.4; }

      .card-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 20px;
        border-top: 1px solid var(--surface-border);
        gap: 8px;
      }

      .card-footer-meta {
        font-family: var(--mono);
        font-size: 10px;
        color: var(--text-tertiary);
        letter-spacing: 0.02em;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
        min-width: 0;
      }

      .actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        border: 0;
        border-radius: var(--radius);
        padding: 8px 14px;
        font-family: var(--sans);
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        outline: none;
        transition: all 0.1s ease;
        white-space: nowrap;
      }

      .btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
      .btn:active { transform: scale(0.97); }

      .btn-ghost { background: transparent; color: var(--text-secondary); }
      .btn-ghost:hover { background: var(--ghost-hover); color: var(--text-primary); }

      .btn-primary { background: var(--accent); color: #fff; }
      .btn-primary:hover { background: var(--accent-hover); }

      .btn-hint {
        font-family: var(--mono);
        font-size: 10px;
        font-weight: 400;
        padding: 1px 4px;
        border-radius: 3px;
        background: rgba(255, 255, 255, 0.15);
        color: inherit;
        opacity: 0.7;
        border: none;
        line-height: 1;
      }

      .btn-ghost .btn-hint {
        background: var(--kbd-bg);
        color: var(--kbd-text);
        border: 1px solid var(--kbd-border);
      }

      @keyframes shakeIn {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-4px); }
        75% { transform: translateX(3px); }
      }

      .error-banner {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 10px 12px;
        border-radius: var(--radius);
        background: var(--danger-bg);
        border: 1px solid var(--danger-border);
        color: var(--danger);
        font-size: 13px;
        line-height: 1.5;
        animation: shakeIn 0.3s ease;
        margin-bottom: 12px;
      }

      .error-banner svg { flex-shrink: 0; margin-top: 1px; }

      kbd {
        font-family: var(--mono);
        font-size: 10px;
        font-weight: 500;
        padding: 1px 4px;
        border-radius: 3px;
        background: var(--kbd-bg);
        color: var(--kbd-text);
        border: 1px solid var(--kbd-border);
        line-height: 1.2;
      }

      /* Autocomplete */
      .ac-wrap { position: relative; }

      .ac-dropdown {
        display: none;
        position: absolute;
        left: 0; right: 0; bottom: 100%;
        margin-bottom: 4px;
        max-height: 240px;
        overflow-y: auto;
        background: var(--surface);
        border: 1px solid var(--surface-border);
        border-radius: var(--radius-lg);
        box-shadow: var(--surface-shadow);
        z-index: 100;
        padding: 4px;
      }

      .ac-dropdown.open { display: block; animation: appear 0.12s ease both; }

      .ac-header {
        padding: 6px 8px 4px;
        font-family: var(--mono);
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--text-tertiary);
      }

      .ac-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 8px;
        border-radius: var(--radius-sm);
        cursor: pointer;
        transition: background 0.06s;
        font-size: 13px;
        color: var(--text-primary);
      }

      .ac-item:hover, .ac-item.active { background: var(--ghost-hover); }

      .ac-item-icon {
        flex-shrink: 0;
        width: 22px; height: 22px;
        border-radius: var(--radius-sm);
        background: var(--kbd-bg);
        display: grid;
        place-items: center;
        font-family: var(--mono);
        font-size: 11px;
        color: var(--text-secondary);
        border: 1px solid var(--surface-border);
      }

      .ac-item-text {
        flex: 1; min-width: 0;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        font-family: var(--mono);
        font-size: 12px;
      }

      .ac-item-desc {
        font-size: 11px;
        color: var(--text-tertiary);
        font-family: var(--mono);
      }

      .ac-empty {
        padding: 12px 8px;
        font-size: 12px;
        color: var(--text-tertiary);
        text-align: center;
        font-family: var(--mono);
      }

      .ac-footer {
        padding: 6px 8px;
        border-top: 1px solid var(--surface-border);
        margin-top: 4px;
        display: flex;
        gap: 10px;
        font-size: 10px;
        color: var(--text-tertiary);
        font-family: var(--mono);
      }

      @media (max-width: 520px) {
        body { padding: 8px; }
        .card { border-radius: var(--radius); }
        .card-header { padding: 12px 16px; }
        .card-body { padding: 16px; }
        .card-footer { padding: 10px 16px; flex-direction: column; align-items: stretch; }
        .actions { justify-content: flex-end; }
        .btn-hint { display: none; }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <div class="card">
        <div class="card-header">
          <div class="card-icon">${icon}</div>
          <span class="card-badge">${escapeHtml(kindLabel)}</span>
          <span class="card-title">${escapeHtml(definition.title)}</span>
        </div>
        <div class="card-body">
          <p class="prompt-text">${escapeHtml(definition.prompt)}</p>
          ${
            errorMessage
              ? `<div class="error-banner">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                  <span>${escapeHtml(errorMessage)}</span>
                </div>`
              : ""
          }
          <form id="dialog-form" method="post" action="/dialog/${encodeURIComponent(id)}">
            ${formBody}
          </form>
        </div>
        <div class="card-footer">
          <span class="card-footer-meta">${escapeHtml(id)}</span>
          ${actions}
        </div>
      </div>
    </main>
    <script>
      (function() {
        var form = document.getElementById('dialog-form');
        if (!form) return;

        document.addEventListener('keydown', function(e) {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            var btn = document.querySelector('.btn-primary');
            if (btn) btn.click();
          }
        });

        document.addEventListener('keydown', function(e) {
          if (e.key === 'Escape' && !document.querySelector('.ac-dropdown.open')) {
            var cancel = document.querySelector('[value="cancel"]');
            if (cancel) { e.preventDefault(); cancel.click(); }
          }
        });

        document.querySelectorAll('form').forEach(function(f) {
          f.addEventListener('submit', function() {
            document.querySelectorAll('.btn').forEach(function(b) {
              b.disabled = true;
              b.style.opacity = '0.5';
              b.style.pointerEvents = 'none';
            });
          });
        });

        var textarea = document.getElementById('main-input');
        if (!textarea) return;

        var TRIGGERS = {
          '@': { endpoint: '/api/files',     label: 'FILES',     icon: '~' },
          '#': { endpoint: '/api/issues',    label: 'ISSUES',    icon: '#' },
          '/': { endpoint: '/api/commands',  label: 'COMMANDS',  icon: '>' },
          '?': { endpoint: '/api/shortcuts', label: 'SHORTCUTS', icon: '?' },
        };

        var wrap = textarea.parentElement;
        if (wrap) wrap.classList.add('ac-wrap');

        var dropdown = document.createElement('div');
        dropdown.className = 'ac-dropdown';
        dropdown.setAttribute('role', 'listbox');
        if (wrap) wrap.appendChild(dropdown);

        var activeIndex = -1, items = [], currentTrigger = null, triggerStart = -1, fetchTimer = null;

        function closeDropdown() {
          dropdown.classList.remove('open');
          activeIndex = -1; items = []; currentTrigger = null; triggerStart = -1;
        }

        function renderItems(results, trigger) {
          var cfg = TRIGGERS[trigger];
          var html = '<div class="ac-header">' + cfg.label + '</div>';
          if (!results.length) { html += '<div class="ac-empty">no results</div>'; items = []; }
          else {
            items = results;
            results.forEach(function(item, i) {
              var label = '', desc = '', icon = cfg.icon;
              if (trigger === '@') { label = item.path || item.name; desc = item.type === 'dir' ? 'dir' : ''; icon = item.type === 'dir' ? 'd' : '~'; }
              else if (trigger === '#') { label = '#' + item.number + ' ' + item.title; desc = item.type; icon = item.type === 'pr' ? '↗' : '●'; }
              else if (trigger === '/') { label = item.name; desc = item.description || ''; }
              else if (trigger === '?') { label = item.keys; desc = item.description || ''; }
              html += '<div class="ac-item' + (i === 0 ? ' active' : '') + '" role="option" data-index="' + i + '">';
              html += '<div class="ac-item-icon">' + icon + '</div>';
              html += '<span class="ac-item-text">' + esc(label) + '</span>';
              if (desc) html += '<span class="ac-item-desc">' + esc(desc) + '</span>';
              html += '</div>';
            });
            activeIndex = 0;
          }
          html += '<div class="ac-footer"><span>↑↓ nav</span><span>Tab select</span><span>Esc close</span></div>';
          dropdown.innerHTML = html;
          dropdown.classList.add('open');
        }

        function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

        function getInsertText(item, t) {
          if (t === '@') return item.path || item.name;
          if (t === '#') return '#' + item.number;
          if (t === '/') return item.name;
          if (t === '?') return item.keys;
          return '';
        }

        function insertCompletion(item) {
          var text = textarea.value, ins = getInsertText(item, currentTrigger);
          var before = text.substring(0, triggerStart), after = text.substring(textarea.selectionStart);
          if (currentTrigger === '/') {
            if (item.name === '/clear') { textarea.value = ''; closeDropdown(); textarea.focus(); return; }
            if (item.name === '/submit') { closeDropdown(); var b = document.querySelector('.btn-primary'); if (b) b.click(); return; }
            if (item.name === '/cancel') { closeDropdown(); var c = document.querySelector('[value="cancel"]'); if (c) c.click(); return; }
          }
          textarea.value = before + ins + ' ' + after;
          var p = before.length + ins.length + 1;
          textarea.setSelectionRange(p, p);
          closeDropdown(); textarea.focus();
        }

        function setActive(idx) {
          dropdown.querySelectorAll('.ac-item').forEach(function(el, i) {
            el.classList.toggle('active', i === idx);
            if (i === idx) el.scrollIntoView({ block: 'nearest' });
          });
          activeIndex = idx;
        }

        function fetchResults(trigger, query) {
          fetch(TRIGGERS[trigger].endpoint + '?q=' + encodeURIComponent(query))
            .then(function(r) { return r.json(); })
            .then(function(d) { if (currentTrigger === trigger) renderItems(d, trigger); })
            .catch(function() { if (currentTrigger === trigger) renderItems([], trigger); });
        }

        textarea.addEventListener('input', function() {
          var pos = textarea.selectionStart, text = textarea.value, found = null;
          for (var i = pos - 1; i >= 0; i--) {
            var ch = text[i];
            if ('\\n\\r \\t'.indexOf(ch) >= 0) break;
            if (TRIGGERS[ch] && (i === 0 || /[\\s]/.test(text[i - 1]))) {
              found = { trigger: ch, start: i, query: text.substring(i + 1, pos) };
              break;
            }
          }
          if (!found) { closeDropdown(); return; }
          currentTrigger = found.trigger; triggerStart = found.start;
          clearTimeout(fetchTimer);
          fetchTimer = setTimeout(function() { fetchResults(found.trigger, found.query); }, 100);
        });

        textarea.addEventListener('keydown', function(e) {
          if (!dropdown.classList.contains('open')) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); if (activeIndex < items.length - 1) setActive(activeIndex + 1); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); if (activeIndex > 0) setActive(activeIndex - 1); }
          else if (e.key === 'Tab' || e.key === 'Enter') { if (activeIndex >= 0 && activeIndex < items.length) { e.preventDefault(); insertCompletion(items[activeIndex]); } }
          else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeDropdown(); }
        });

        dropdown.addEventListener('click', function(e) {
          var t = e.target.closest('.ac-item');
          if (t) { var i = parseInt(t.dataset.index, 10); if (i >= 0 && i < items.length) insertCompletion(items[i]); }
        });

        document.addEventListener('click', function(e) {
          if (!dropdown.contains(e.target) && e.target !== textarea) closeDropdown();
        });
      })();
    </script>
  </body>
</html>`;
}

function mapInputType(inputType: "text" | "password" | "integer" | "float"): string {
  switch (inputType) {
    case "password":
      return "password";
    case "integer":
    case "float":
    case "text":
      return "text";
    default:
      return assertNever(inputType);
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`);
}
