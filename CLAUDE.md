# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Firefox WebExtension (Manifest V3) that autofills web forms by sending the page's form structure plus user-supplied background information to an LLM via OpenRouter, then writing the model's suggestions back into the page.

## Running / "Building"

There is no build step — the extension files are loaded directly by Firefox with no bundling or transpilation.

To run during development:
1. Open `about:debugging` in Firefox
2. Click `This Firefox` → `Load Temporary Add-on`
3. Select `manifest.json` from this repo

Reload the add-on from the same page after changing any file.

## Tests

Requires Node.js 22.22.2+ (or 24.15+, or 26+). Unit tests cover the pure helper functions (Vitest + jsdom):

```
npm install      # first time only
npm test         # run once
npm run test:watch
npx vitest run tests/dom_tools.test.js   # run a single test file
```

Tests live in `tests/` and cover `scripts/dom_tools.js` (`domToJson`, `getDomPath`, `getChildIndex`) and `scripts/llm_response.js` (`stripJsonFence`, `parseLlmSuggestions`, `describeError`, `preview`). Run `npm run coverage` for a v8 coverage report under `coverage/` (output is `.gitignore`d).

Those two source files end with a CommonJS export footer guarded by `typeof module !== 'undefined'` so they can be both loaded as classic browser scripts (where the footer is a no-op) and imported by Vitest. The browser-API-heavy code (`popup.js`, the `applySuggestion` DOM writes, `callOpenRouter`) is intentionally not unit-tested — verify those manually in Firefox.

## Architecture

Three execution contexts that communicate via `browser.runtime` messaging:

1. **Popup** (`popup/popup.js`, `popup/popup.html`) — UI shown when the toolbar icon is clicked. Holds the OpenRouter API key and user "background information" in `localStorage` (keys `or_key`, `user_data`, `output_list`). On each Fill click it injects the content script files into the active tab via `browser.scripting.executeScript` (using the `activeTab` permission), then drives the content script by calling `window.fillOutForm(...)` through a second `executeScript({func, args})` call. Using `func+args` rather than `tabs.sendMessage` sidesteps a Firefox MV3 timing race where the injection promise can resolve before any `runtime.onMessage` listener is observable.

2. **Content script** (`scripts/content_script.js` + `scripts/dom_tools.js` + `scripts/llm_tools.js` + `scripts/llm_response.js`) — injected by the popup on Fill click (in that order; each file's top-level functions are globals the later files rely on). `content_script.js` exposes `window.fillOutForm` for the popup to invoke directly. The function scrapes the DOM, calls OpenRouter, and writes results back to the page. Progress and result messages flow back to the popup via `browser.runtime.sendMessage` (the content→popup direction is reliable). `llm_response.js` holds the response-parsing helpers (`stripJsonFence`, `parseLlmSuggestions`).

3. **OpenRouter** (`scripts/llm_tools.js`) — `callOpenRouter()` POSTs to `https://openrouter.ai/api/v1/chat/completions`. The host is whitelisted in `manifest.json` under `host_permissions`. Default model is `google/gemini-2.5-flash` (the only model used; there is no UI to change it). The system prompt lives in the `systemPrompt` constant in this same file. On a non-2xx/network failure it throws `describeError(response)` (from `llm_response.js`), which the content script forwards to the popup as a `-1` problem message.

### DOM addressing scheme

`dom_tools.js` does two things in one pass via `domToJson()`:
- Builds a flat JSON list of "interesting" nodes (matching `tagFilter = ['input','textarea','select','option']` or `classFilter = ['ql-editor']`, plus any node with non-empty text).
- Stamps a synthetic `path` attribute on each interesting DOM node (e.g. `/html/body/div:2/form/input:1`) using `getDomPath()`. Indices are appended only when a parent has multiple children.

The LLM is asked to return `{path, value, label}` objects. `processLlmResult()` in `content_script.js` looks elements up via `document.querySelector('[path="..."]')` and dispatches by tag:
- `input`/`textarea` → `element.focus()` + `document.execCommand('insertText', ...)` (simulates typing so framework listeners fire)
- `span`/`div` → `element.click()`; special-cased for `ql-editor` (Quill) where the inner `<p>` is overwritten directly
- elements with a `value` attribute → `element.value = ...`

When adding support for new widget types, extend this dispatch — don't change the path scheme.

### Message protocol

Messages between popup and content script use a `state` field: `0` default / payload, `1` running (shows progress bar + debug text), `2` done (hides progress bar), `-1` problem. Payload messages with `state=0` carry a JSON-stringified `{label, value}` which the popup appends to the `#output_list` `<dl>` and persists to `localStorage`.

### LLM response parsing

The model often wraps JSON in ```` ```json ... ``` ```` fences; `parseLlmSuggestions()` in `llm_response.js` strips those (via `stripJsonFence`) before `JSON.parse`. If you change the system prompt, keep the contract that the response is a JSON array of `{path, value, label}` (optionally `remark`).
