# Plan: VSCode Extension "go-extras" - Filtered References

This plan outlines the remaining tasks and potential future enhancements for the "go-extras" VSCode extension, focusing on the "Filtered References" feature.

*(For details on the completed implementation steps, see `DEV_PROCESS.md`)*
*(For a high-level overview of the components, see `ARCHITECTURE.md`)*

## 1. Goal (Achieved in Initial Implementation)

Create a VSCode extension named "go-extras" that replicates Goland's "Filter References by Read/Write" feature for Go code.

## 2. Core Features (Implemented)

*   **Command:** `go-extras.filterReferences` triggered via context menu and keyboard shortcut.
*   **Dependency:** Uses the official Go extension (`golang.go`) via `vscode.executeReferenceProvider`.
*   **UI Panel:** A Webview View (`goExtrasReferencesView`) in the bottom panel area.
*   **Filtering:** Checkboxes and Tree view using `@vscode-elements/elements`. Heuristic-based classification.
*   **Interaction:** Filters update Peek Locations view; tree selection filters Peek Locations view by file.
*   **Technology:** VSCode API, TypeScript, `WebviewViewProvider`, `@vscode-elements/elements`, `esbuild`.
  
## 3. Current Issues

- Tree not visible in webview.
- References data not being sent to webview on filter change.
- If both read and write are unchecked and checked again, peek view doesn't open sometimes.


## 4. Remaining Tasks

*   **Build & Packaging:**
    *   **`.vscodeignore`:** Update `.vscodeignore` to exclude source files (`src/`, `webview-ui/`, `node_modules/` etc.) and include only necessary distribution files (`dist/`, `package.json`, `README.md`, `CHANGELOG.md`, etc.).
    *   **`vsce package`:** Use `vsce package` (requires `vsce` to be installed globally: `npm install -g @vscode/vsce`) to create the distributable `.vsix` file. Test the packaging process.
*   **Testing:**
    *   **Manual Testing:** Thoroughly test the feature in the VSCode Extension Development Host:
        *   Trigger command via context menu and shortcut.
        *   Verify panel appears correctly.
        *   Test with various Go projects and different types of variables/symbols.
        *   Test read/write filter checkboxes individually and together.
        *   Test file selection in the tree view.
        *   Verify Peek Locations view updates correctly based on filters and selection.
        *   Check behavior when the command is invoked on symbols with no references.
    *   **Edge Case Testing:**
        *   Test when the official Go extension (`golang.go`) is disabled or not installed. (Should show an informative error).
        *   Test with very large numbers of references (check for performance issues in classification/filtering/UI).
        *   Test on different operating systems if possible.
    *   **(Optional) Automated Tests:** Consider adding basic unit/integration tests for classification logic or provider methods in the future (`src/test/`).
*   **Documentation:**
    *   **`README.md`:** Update `README.md` with:
        *   Clear description of the "Filtered References" feature.
        *   Usage instructions (how to trigger the command, use the panel).
        *   Screenshots or GIFs demonstrating the feature.
        *   Configuration options (e.g., default keybinding).
        *   Known limitations (e.g., heuristic accuracy).
    *   **`CHANGELOG.md`:** Initialize `CHANGELOG.md` with the first version release notes. Maintain it for future updates.
    *   **Code Comments:** Review code for clarity and add/improve comments where necessary.

## 5. Potential Future Enhancements

*   **Improved Classification:**
    *   Refine regex heuristics further.
    *   Explore using Go's Abstract Syntax Tree (AST) parsing (potentially via `gopls` or a dedicated Go analysis tool/server) for much more accurate read/write classification, especially regarding function calls modifying pointers. This would be a significant architectural change.
*   **UI/UX Improvements:**
    *   Add visual indicators (e.g., icons, color-coding) to the tree view items to show read/write status directly.
    *   Display counts of read/write references next to checkboxes or file nodes.
    *   Add a "Clear" or "Close" button to the panel.
    *   Persist filter state across sessions.
    *   Allow configuration of default filter state.
*   **Performance Optimization:**
    *   Optimize classification if it proves slow for large projects (e.g., more aggressive caching, background processing).
*   **Additional Features (Modularity):**
    *   Leverage the "Go Extras" panel/container for other Go-related enhancements.
*   **Configuration:**
    *   Add VSCode settings to configure behavior (e.g., default panel location - though less common for panel views, default filters).
