# GO Extras

[![Version](https://img.shields.io/visual-studio-marketplace/v/shivamkumar.go-extras)](https://marketplace.visualstudio.com/items?itemName=shivamkumar.go-extras)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/shivamkumar.go-extras)](https://marketplace.visualstudio.com/items?itemName=shivamkumar.go-extras)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/shivamkumar.go-extras)](https://marketplace.visualstudio.com/items?itemName=shivamkumar.go-extras)

A Visual Studio Code extension that provides advanced Go development features that extend beyond the official VS Code Go extension.


## Overview

Go Extras enhances the Go development experience in VS Code by adding powerful features not found in the standard toolset. This extension will grow over time to include various capabilities that make Go development more productive and insightful. The initial release focuses on improving symbol reference analysis with intelligent filtering options.


### Capabilities

*   **Dedicated Panel View:** Displays references in a structured tree view within the VS Code panel (`Go Extras: Filtered References`).
*   **Reference Classification:** Leverages the Go Language Server (`gopls` via the `golang.go` extension) to classify references as:
    *   **Read:** Symbol is being read (e.g., used in an expression).
    *   **Write:** Symbol is being written to (e.g., assignment, declaration).
    *   **Text:** Symbol appears in comments or strings (classification may vary based on `gopls` behavior).
*   **Interactive Filtering:**
    *   **Checkboxes:** Quickly toggle Read/Write/Text classifications to filter the displayed references.
    *   **Tree View Selection:** Click on files or directories within the tree to narrow down the references shown in the Peek View.
*   **Path Compression:** Directory paths in the tree view are compressed (e.g., `src/app/components/` instead of nested nodes) for better readability.
*   **Peek View Integration:** Filter selections instantly update VS Code's native Peek References view (`editor.action.showReferences`).
*   **Direct Navigation:** Clicking on a specific reference line (e.g., `Line 10:5`) in the tree view navigates directly to that location in the editor.


### Activation

You can activate the Filtered References feature in several ways when your cursor is on a Go symbol:

1.  **Command Palette:** Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`) and search for `Go Extras: Filtered References`.
2.  **Context Menu:** Right-click on the symbol in a Go file and select `Go Extras: Filtered References`.
3.  **Keyboard Shortcut:** Press `Alt+Shift+R` (configurable in VS Code keyboard shortcuts).


## How it Works (Filtered References)

1.  Place your cursor on a Go symbol (variable, function, type, etc.) in your code.
2.  Activate the feature using one of the methods listed above.
3.  The **Go Extras: Filtered References** panel will open (usually in the bottom panel area).
4.  The panel displays:
    *   Checkboxes for `Read`, `Write`, and `Text` filters (initially all checked).
    *   A tree view grouping references by file and directory.
5.  Simultaneously, VS Code's Peek View will appear, showing all found references.
6.  **Filtering:**
    *   Uncheck/check the `Read`, `Write`, `Text` boxes in the panel to instantly filter the locations shown in the **Peek View**. The tree view itself *currently* shows all references but may be updated in the future.
    *   Clicking a **file** or **directory** in the panel's tree view will filter the **Peek View** to show only references within that selection.
    *   Clicking a specific **reference line** (e.g., `Line 15:3`) in the tree view will close the Peek View and navigate directly to that line in the editor.


## Screenshots

<!-- ![Filtered References Panel](images/filtered-references.png)

*The Filtered References panel showing classified references with filter controls.* -->


## Requirements

* Visual Studio Code.
* **Go Extension:** The official `golang.go` extension must be installed and enabled, as Go Extras relies on it for finding and classifying references via the Go Language Server (`gopls`).


## Development and Build Process

### Prerequisites

*   Node.js (LTS version recommended)
*   npm (comes with Node.js)
*   Visual Studio Code for testing

### Setup

1.  Clone the repository:

```bash
git clone https://github.com/ShivamKumar2002/go-extras.git
cd go-extras
```

2.  Install dependencies:

```bash
npm install
```

### Build Commands

*   **Compile (Development):**

```bash
npm run compile
```

This runs type checking, linting, and builds the extension using esbuild.

*   **Watch Mode:**

```bash
npm run watch
```

This starts a development mode that automatically rebuilds when files change. It runs both esbuild and TypeScript type checking in watch mode.

*   **Package for Production:**

```bash
npm run package
```

This creates a production build of the extension, optimized and ready for distribution.

*   **Type Checking:**

```bash
npm run check-types
```

Runs the TypeScript compiler to check for type errors without emitting files.

*   **Linting:**

```bash
npm run lint
```

Runs ESLint to check for code style issues and potential bugs.

### Testing

*   **Run Tests:**

```bash
npm test
```

This runs the test suite using VS Code's testing infrastructure.

*   **Compile Tests Only:**

```bash
npm run compile-tests
```

### Debugging in VS Code

1.  Open the repository in VS Code
2.  Press F5 to start debugging
3.  This will launch a new VS Code Extension Development Host window where you can test the extension

### Publishing

The extension is published to the VS Code Marketplace using:

```bash
vsce package
vsce publish
```

Note: You'll need to have `@vscode/vsce` installed globally and be logged in with appropriate publisher rights.


## Extension Settings

This extension does not currently contribute any specific settings.


## Known Issues

* Reference classification accuracy depends entirely on the underlying `gopls` results provided by the `golang.go` extension.

Please report any bugs or unexpected behavior by opening an issue on the project's GitHub repository.


## Release Notes

See the [CHANGELOG.md](CHANGELOG.md) file for details on changes in each version.


## Contributing

Contributions are welcome and appreciated! Here's how you can contribute:

1. **Report Issues**: Found a bug or have a feature request? Open an [issue](https://github.com/ShivamKumar2002/go-extras/issues).
2. **Submit Pull Requests**: Have a fix or new feature to contribute? Submit a [pull request](https://github.com/ShivamKumar2002/go-extras/pulls).
3. **Improve Documentation**: Help improve documentation by fixing errors or adding examples.

Please ensure your code follows the project's coding standards and includes appropriate tests.

## License

This extension is licensed under the [MIT License](LICENSE).

Copyright (c) 2025 Shivam Kumar
