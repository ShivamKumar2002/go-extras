# Change Log

All notable changes to the "go-extras" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [1.0.0] - 2025-04-01

### Added
- Initial release of go-extras VSCode extension
- Filter Go references by Read/Write operations using regex heuristics
- Dedicated side panel with webview interface for displaying filtered references
- Toggle buttons for Read/Write filtering options
- Tree view of references organized by file hierarchy
- Navigation to reference locations directly from the tree view
- Integration with VSCode's peek references functionality
- Compatible with the official Go extension
- Support for detecting and classifying reference types in Go code

### Technical
- Built with TypeScript and VSCode Extension API
- UI components from @vscode-elements/elements library
- Responsive webview panel with modern VS Code styling
- Optimized directory tree structure with path compression for better navigation
