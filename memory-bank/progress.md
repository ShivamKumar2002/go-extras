# Progress Tracking: go-extras VS Code Extension

## Implemented Features
- [x] Command registration (`go-extras.filterReferences`)
- [x] Context menu integration for Go files
- [x] Keyboard shortcut (Alt+Shift+R)
- [x] Webview panel with filter controls
- [x] Reference tree view with file grouping
- [x] LSP-based reference classification (Read/Write/Text)
- [x] Dynamic filtering of Peek View
- [x] Build process with esbuild

## Current Issues
1. **Peek View Stability**:
   - Closes when filters are toggled while open
2. **Tree View Behavior**:
   - File node clicks cause unwanted re-renders

## Pending Tasks
1. **Bug Fixes**:
   - Stabilize Peek View during filter changes
   - Improve tree view rendering
2. **Packaging**:
   - Finalize `.vscodeignore`
   - Test `vsce package`
3. **Testing**:
   - Comprehensive manual testing
   - Edge case scenarios
4. **Documentation**:
   - Update README.md
   - Initialize CHANGELOG.md