# Architecture: "go-extras" VSCode Extension

This document provides a high-level overview of the "go-extras" VSCode extension architecture, focusing on the "Filtered References" feature.

## Core Components

1.  **Extension Host (`src/extension.ts`)**:
    *   **Activation:** Activated by the `go-extras.filterReferences` command or when the `goExtrasReferencesView` view is shown.
    *   **Command Registration:** Registers the `go-extras.filterReferences` command.
    *   **View Provider Registration:** Instantiates and registers the `ReferencesViewProvider`.
    *   **Reference Fetching:** When the command is triggered, it interacts with the official Go extension (`golang.go`) using `vscode.executeReferenceProvider` to get the list of references for the symbol under the cursor.
    *   **Coordination:** Passes the fetched references to the `ReferencesViewProvider` and ensures the webview panel is focused.

2.  **Webview View Provider (`src/ReferencesViewProvider.ts`)**:
    *   **View Management:** Implements `vscode.WebviewViewProvider` to manage the lifecycle and content of the webview panel (`goExtrasReferencesView`) located in the bottom panel area.
    *   **HTML Generation:** Dynamically loads `dist/index.html`, injects necessary resource URIs (for JS, CSS) and a security nonce using `_getHtmlForWebview`.
    *   **State Management:** Holds the current list of references (`_currentRefs`), the original context (`_originalUri`, `_originalPosition`), the filter state (`_filterState`), and a cache for classification results (`_classificationCache`).
    *   **Communication Bridge:** Handles messages received from the webview (`handleMessage`) and sends messages back (`_postMessage`).
    *   **Reference Classification:** Implements heuristic logic (`_classifyReference`) to classify references as 'read' or 'write'. Reads file content as needed.
    *   **Filtering Logic:** Filters the references based on the current `_filterState` and optional file path selection (`_filterReferences`).
    *   **Peek View Integration:** Interacts with VSCode's Peek Locations view (`editor.action.peekLocations`) to display the *filtered* list of references (`_showPeekView`).

3.  **Webview UI (`webview-ui/`)**:
    *   **Structure (`index.html`)**: Defines the HTML structure of the panel, including placeholders for dynamic content (CSP, nonce, URIs) and the core UI elements (`<vscode-checkbox-group>`, `<vscode-tree>`).
    *   **Logic (`main.mts`)**:
        *   Runs inside the webview panel's isolated context.
        *   Uses `@vscode-elements/elements` custom elements for the UI.
        *   Communicates with the Extension Host via the VSCode Webview API (`acquireVsCodeApi`).
        *   **Message Handling:** Receives `updateRefs` messages, processes the reference data (`buildTreeData`), and updates the `<vscode-tree>`.
        *   **Event Handling:** Listens for changes on the filter checkboxes and selection events on the tree, sending `filtersChanged` or `fileSelected` messages back to the `ReferencesViewProvider`.

4.  **Build Process (`esbuild.js`)**:
    *   Uses `esbuild` to bundle the Extension Host code (CommonJS) and the Webview UI code (ES Module).
    *   Copies static assets (HTML, CSS, fonts) from source/`node_modules` to the `dist` directory.

## Data Flow (Filtered References Command)

1.  User triggers `go-extras.filterReferences` command in a Go file.
2.  `extension.ts` gets editor context (URI, position).
3.  `extension.ts` calls `vscode.executeReferenceProvider` (via Go extension).
4.  Go extension returns `vscode.Location[]`.
5.  `extension.ts` calls `ReferencesViewProvider.setReferences` with the locations and context.
6.  `ReferencesViewProvider` stores data, posts `updateRefs` message to Webview.
7.  `main.mts` (Webview) receives message, calls `buildTreeData`.
8.  `main.mts` updates the `<vscode-tree>` element's `data` property.
9.  `ReferencesViewProvider` calls `_filterReferences` (using default filters).
10. `_filterReferences` calls `_classifyReference` for each relevant reference (using cache).
11. `_classifyReference` reads file content (if needed) and applies heuristics.
12. `_filterReferences` returns filtered `vscode.Location[]`.
13. `ReferencesViewProvider` calls `_showPeekView` with filtered locations.
14. VSCode displays the filtered references in the Peek Locations view.

## Interaction Flow (Filter Change / Tree Selection)

1.  User interacts with checkboxes or tree in the Webview panel.
2.  `main.mts` detects the event (`change` or `vsc-select`).
3.  `main.mts` sends `filtersChanged` or `fileSelected` message to `ReferencesViewProvider`.
4.  `ReferencesViewProvider.handleMessage` updates internal state (`_filterState`).
5.  `ReferencesViewProvider` calls `filterAndShowPeekView` (with optional file path).
6.  Steps 9-14 from the "Data Flow" section repeat with the updated state/path.

## Key Technologies

*   VSCode API (Commands, Webview, WebviewViewProvider, Workspace, Window, Progress)
*   TypeScript
*   Node.js (Extension Host)
*   HTML/CSS/JavaScript (Webview)
*   `@vscode-elements/elements` (Webview UI Components)
*   `esbuild` (Bundler)
