# Product Context: go-extras VS Code Extension

## Problem Space
Navigating and analyzing symbol references in large Go codebases can be inefficient when all references are shown without classification. Developers need to quickly identify:
- Where a variable is read vs. written
- Textual matches (comments, strings) vs. actual code references

## Solution Approach
The "Filtered References" feature provides:
- Explicit Read/Write/Text filtering controls
- Visual grouping of references by file
- Seamless integration with VS Code's native Peek View
- Reliable classification using the Go Language Server (gopls)

## User Experience
1. Developer triggers `go-extras.filterReferences` via:
   - Context menu in Go files
   - Keyboard shortcut (Alt+Shift+R)
   - Command palette
2. References panel appears showing filter checkboxes and file tree
3. Filter selections instantly update the Peek View
4. File selection in the tree filters Peek View to that file

## Value Proposition
- Saves time when analyzing symbol usage
- Reduces cognitive load by separating read/write contexts
- Maintains familiar VS Code workflows (Peek View)
- Leverages existing Go tooling (golang.go extension)