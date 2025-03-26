# Development Process: "go-extras" Filtered References

This document outlines the steps taken to implement the initial version of the "go-extras" filtered references feature.

## 1. Project Setup & Configuration (Completed)

*   **Dependencies:** Installed `@vscode-elements/elements` and `@types/trusted-types`.
    ```bash
    npm install @vscode-elements/elements
    npm install --save-dev @types/trusted-types
    ```
*   **Build Process (`esbuild.js`):**
    *   Configured `esbuild` with two contexts: one for the Node.js extension host (`src/extension.ts` -> `dist/extension.js`) and one for the browser webview (`webview-ui/main.mts` -> `dist/webview.js`).
    *   Added asset copying logic (`copyAssets` function) to copy `index.html`, `codicon.css`, and `codicon.ttf` to the `dist` directory.
    *   Updated watch/build logic to handle both contexts.
*   **`package.json`:**
    *   Added `activationEvents`: `onCommand:go-extras.filterReferences` and `onView:goExtrasReferencesView`.
    *   Set `main` to `./dist/extension.js`.
    *   Added `contributes`:
        *   `commands`: Defined `go-extras.filterReferences`.
        *   `menus`: Added context menu entry for Go files.
        *   `keybindings`: Added default `alt+shift+r` keybinding.
        *   `views`: Contributed `goExtrasReferencesView` to the `panel`.
*   **`tsconfig.json`:**
    *   Removed `rootDir`.
    *   Added `"DOM"` to `lib`.
    *   Added `"esModuleInterop": true`.
    *   Added `"skipLibCheck": true` (as per user feedback) to resolve dependency type issues.

## 2. Extension Implementation (`src/`) (Completed)

*   **`extension.ts` (Main Entry Point):**
    *   Imported `vscode` and `ReferencesViewProvider`.
    *   `activate` function:
        *   Instantiated `ReferencesViewProvider`, passing `context` and `extensionUri`.
        *   Registered the view provider using `vscode.window.registerWebviewViewProvider`.
        *   Registered the command `go-extras.filterReferences`:
            *   Checks for active Go editor.
            *   Gets current URI and position.
            *   Executes `vscode.executeReferenceProvider` via `vscode.window.withProgress`. Handles errors and cases with no references.
            *   Passes references and context to `ReferencesViewProvider.setReferences`.
            *   Focuses the view using `vscode.commands.executeCommand('goExtrasReferencesView.focus')`.
    *   Included basic `deactivate` function.
*   **`ReferencesViewProvider.ts`:**
    *   Implemented `vscode.WebviewViewProvider`.
    *   Defined `viewType`.
    *   Managed state: `_view`, `_extensionUri`, `_extensionContext`, `_currentRefs`, `_originalUri`, `_originalPosition`, `_filterState`, `_classificationCache`.
    *   `resolveWebviewView`:
        *   Set webview options (`enableScripts`, `localResourceRoots`).
        *   Set initial HTML content by calling `_getHtmlForWebview`.
        *   Set up message listener (`onDidReceiveMessage`).
    *   `setReferences`: Stores refs/context, clears cache, posts `updateRefs` message to webview, triggers initial `filterAndShowPeekView`.
    *   `handleMessage`: Processes messages from webview (`webviewReady`, `filtersChanged`, `fileSelected`, `showError`).
    *   `filterAndShowPeekView`: Wraps filtering and peek view update in `vscode.window.withProgress`.
    *   `_filterReferences`: Filters `_currentRefs` based on `_filterState` and optional `filePath`, using `_classifyReference`.
    *   `_classifyReference`: Implemented heuristic-based classification ('read'/'write') with caching. Refined heuristics to check assignment context and `append`.
    *   `_showPeekView`: Executes `editor.action.peekLocations` command with filtered locations and original context. Handles empty results by closing the peek view.
    *   `_getHtmlForWebview`: Reads `dist/index.html`, replaces placeholders (`{{cspSource}}`, `{{nonce}}`, `{{scriptUri}}`, `{{codiconsUri}}`) with dynamic values, and returns the final HTML string. Includes fallback error HTML.
    *   `_postMessage`: Helper to send messages to the webview.
    *   Added `escapeRegex` helper.
    *   Added `getNonce` helper.

## 3. Webview Implementation (`webview-ui/`) (Completed)

*   **`index.html`:**
    *   Created basic HTML structure.
    *   Added CSP meta tag with placeholders (`{{cspSource}}`, `{{nonce}}`).
    *   Added link tag for codicons CSS with placeholder (`{{codiconsUri}}`).
    *   Included `<vscode-checkbox-group>` and `<vscode-tree>` elements.
    *   Added script tag for webview JS with placeholders (`{{nonce}}`, `{{scriptUri}}`).
    *   Added basic CSS for layout.
*   **`main.mts` (Webview Logic - Renamed from `.ts`):**
    *   Imported necessary `@vscode-elements/elements` components and types.
    *   Acquired VSCode API using `acquireVsCodeApi`.
    *   Got references to DOM elements (checkbox group, tree).
    *   Implemented `buildTreeData` function to transform `VSCodeLocation[]` into the nested format required by `<vscode-tree>`, grouping by file path and sorting.
    *   Added `postMessage` helper.
    *   Added message listener (`window.addEventListener('message', ...)`):
        *   Handles `'updateRefs'`: Stores refs, calls `buildTreeData`, updates `referenceTree.data`.
    *   Added event listeners:
        *   Checkbox group `change` event: Posts `filtersChanged` message.
        *   Tree `vsc-select` event: Posts `fileSelected` message with the file path (or null).
    *   Posted `'webviewReady'` message on initialization.

## 4. Initial Build & Debugging (Completed)

*   Ran `npm run compile`.
*   Resolved `trusted-types` dependency issue by installing `@types/trusted-types`.
*   Fixed `ReferencesViewProvider` constructor call in `extension.ts`.
*   Addressed TypeScript module resolution issues by:
    *   Modifying `tsconfig.json` (`lib`, removing `rootDir`, adding `esModuleInterop`, `skipLibCheck`).
    *   Renaming `webview-ui/main.ts` to `webview-ui/main.mts`.
    *   Updating `esbuild.js` entry point for webview.
*   Corrected `_getHtmlForWebview` to load from `index.html` file instead of using a hardcoded string, including adding `fs`/`path` imports and updating placeholders in `index.html`.
