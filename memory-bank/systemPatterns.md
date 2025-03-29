# System Patterns: go-extras VS Code Extension

## Architecture Overview
The extension consists of three main components:

1. **Extension Host (`src/extension.ts`)**:
   - Handles command registration (`go-extras.filterReferences`)
   - Fetches references via `golang.go` extension (`executeReferenceProvider`)
   - Coordinates with the View Provider

2. **Webview View Provider (`src/ReferencesViewProvider.ts`)**:
   - Manages webview lifecycle
   - Generates HTML with injected resources
   - Handles state (references, filters)
   - Bridges communication with webview
   - Performs LSP-based classification (`_classifyReferenceGopls`)
   - Filters references based on UI state
   - Controls Peek View (`editor.action.showReferences`)

3. **Webview UI (`src/ReferencesWebview.ts` + `webview-ui/references.html`)**:
   - Renders filter controls (`vscode-checkbox-group`)
   - Displays reference tree (`vscode-tree`)
   - Communicates with provider via `acquireVsCodeApi`
   - Builds tree data structure (`buildTreeData`)

## Communication Flow
```mermaid
graph LR
    A[User Action] --> B(extension.ts)
    B -- Get Refs --> C(golang.go)
    C --> B
    B -- setReferences --> D(ReferencesViewProvider.ts)
    D -- updateRefs --> E(ReferencesWebview.ts)
    E -- buildTreeData --> F(Webview Panel)
    D -- filterAndUpdateViews --> D
    D -- _filterReferences --> D
    subgraph Classification
        D -- _classifyReferenceGopls --> G(executeDocumentHighlights)
        G --> H(golang.go LSP)
        H --> G
        G --> D
    end
    D -- _showPeekView --> I(Peek View)

    F -- User Interaction --> E
    E -- filtersChanged/fileSelected --> D
    D -- handleMessage --> D
    D -- filterAndUpdateViews --> D

    style C fill:#f9f,stroke:#333
    style H fill:#f9f,stroke:#333
    style I fill:#ccf,stroke:#333
    style F fill:#ccf,stroke:#333
```

## Key Patterns
1. **Lazy Classification**: References are classified on-demand using LSP
2. **CSP-Secure Webview**: HTML uses strict CSP with nonce for scripts
3. **View Provider Pattern**: Dedicated class manages webview lifecycle
4. **Message-Based Communication**: Webview and extension communicate via `postMessage`