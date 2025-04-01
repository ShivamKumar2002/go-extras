# Change Log

All notable changes to the "go-extras" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [1.1.0] - 2025-04-01

**Go Extras 1.1.0: Improved UI with custom icons, wider VSCode compatibility, and better performance**

### Added

- Custom SVG logo for Go Extras panel and references view icons
- Added `retainContextWhenHidden` option to webview view provider registration for improved performance

### Changed

- Downgraded VSCode engine version requirement from 1.98.0 to 1.75.0 for wider compatibility

### Documentation

- Added semantic highlighting configuration instructions for gopls in README
- Updated README with improved installation and usage instructions
- Added keywords in package.json for better marketplace visibility

### Maintenance

- Updated various dependencies (@types/node, npm-run-all2, typescript-eslint, esbuild)

**Full Changelog**: https://github.com/ShivamKumar2002/go-extras/compare/v1.0.0...v1.1.0


## [1.0.0] - 2025-04-01

### Added

- Initial release of go-extras VSCode extension.
- Dedicated panel with webview interface for displaying filtered references.
- Toggle buttons for Read/Write filtering options.
- Tree view of references organized by file hierarchy.
- Navigation to reference locations directly from the tree view.
- Integration with VSCode's peek references functionality.
- Compatible with the official Go extension.
- Support for detecting and classifying reference types in Go code.


### Technical

- Built with TypeScript and VSCode Extension API.
- UI components from @vscode-elements/elements library.
- Responsive webview panel with modern VS Code styling.
- Optimized directory tree structure with path compression for better navigation.
