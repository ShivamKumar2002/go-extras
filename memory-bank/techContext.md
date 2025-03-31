# Technical Context: go-extras VS Code Extension

## Core Technologies
- **Primary Language**: TypeScript
- **Platform**: Node.js (Extension Host), VS Code Webview (Browser context)
- **Framework**: VS Code API (`vscode` namespace)

## Key Dependencies
- `@vscode-elements/elements`: Webview UI components (checkboxes, tree)
- `@vscode/codicons`: Icon set for UI elements
- `golang.go` extension: Provides LSP integration for reference finding/classification

## Build Tooling
- **Bundler**: esbuild (configured in `esbuild.js`)
- **Output Format**: CommonJS (for both extension and webview)
- **Assets**: Copies `references.html`, `codicon.css`, `codicon.ttf` to `dist` directory.
- **Problem Matcher**: Includes `esbuildProblemMatcherPlugin` for better error reporting in watch mode.

## Development Setup
1. **Requirements**:
   - Node.js
   - npm
   - VS Code Extension Development Host

2. **Key Scripts**:
   - `npm run compile`: Full build (type checking, linting, bundling)
   - `npm run watch`: Continuous development build
   - `npm run package`: Production build

## Testing Approach
- **Test Framework**: vscode-test
- **Current Coverage**:
  - Basic extension activation
  - Webview provider initialization
- **Needs Implementation**:
  - Reference classification tests
  - Filtering logic tests
  - UI interaction tests