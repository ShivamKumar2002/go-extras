# Active Context: go-extras VS Code Extension

## Current Focus
- Stabilizing the "Filtered References" feature set
- Addressing known UI/UX issues
- Preparing for initial release

## Current State
### Implementation Details
- Reference classification uses Go Language Server (gopls) via `vscode.executeDocumentHighlights`
- Build process configured in `esbuild.js`
- Webview components in `src/ReferencesWebview.ts` and `webview-ui/references.html`
- Activation is lazy (no explicit `activationEvents` in `package.json`)

### Known Issues
1. **Peek View Behavior**: Closes unexpectedly when filters are toggled while open
2. **Tree View Rendering**: Clicking file nodes re-renders tree, collapsing children

## Next Steps
1. **Bug Fixes**:
   - Stabilize Peek View behavior during filter changes
   - Improve tree view rendering consistency
2. **Release Preparation**:
   - Finalize `.vscodeignore` for packaging
   - Test `vsce package` process
   - Update `README.md` and `CHANGELOG.md`
3. **Testing**:
   - Comprehensive manual testing across different Go projects
   - Edge case testing (no references, large reference sets)