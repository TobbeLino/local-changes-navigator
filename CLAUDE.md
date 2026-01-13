# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Local Changes Navigator is a VSCode extension that enables navigation through git changes in single or multi-root workspaces. Users cycle through changes with F7 and jump between files with Alt+F7.

## Development Commands

```bash
# Install dependencies
npm install

# Compile with webpack (development)
npm run compile

# Watch mode for development
npm run watch

# Build production bundle
npm run package

# Create VSIX package for distribution
npm run build

# Run linting
npm run lint
```

## Extension Architecture

### Single-File Architecture

The entire extension logic is in `src/extension.ts` (~510 lines). This is intentional to keep the codebase simple and maintainable.

### Core Navigation Flow

1. **Command Registration** (lines 14-108): Eight commands are registered corresponding to different navigation modes (current repo vs all repos, forward vs backward, change-level vs file-level).

2. **Race Condition Prevention**: The `isNavigating` flag prevents concurrent navigation operations from interfering with each other.

3. **Navigation Logic** (`goToNext` function, lines 428-507):
   - Retrieves all file changes using Git API
   - Determines current file position in the change list
   - If not in "file mode", attempts to navigate within current file first
   - If no more changes in file (or in "file mode"), moves to next/previous file
   - Handles wrap-around with notifications

4. **Smart Tab Management** (lines 317-364, 386-420):
   - Distinguishes between pinned tabs and preview tabs
   - Detects "orphaned" tabs (e.g., staged diff tab for unstaged file)
   - Preserves pinned tabs and reuses them
   - Closes preview tabs when switching to pinned tabs

### Key Technical Details

**File Ordering**: Two separate sort functions (`orderFilesForListView` and `orderFilesForTreeView`, lines 115-171) replicate VS Code's SCM view ordering. The extension auto-detects which mode is active via `scm.defaultViewMode` setting.

**Change Detection**: Uses VS Code's Git extension API to detect three types of changes:
- `indexChanges`: Staged changes
- `workingTreeChanges`: Unstaged modifications
- `untrackedChanges`: New untracked files

Each change is mapped to a `FileChange` object (lines 208-212) that tracks URI, staged status, and untracked status.

**Path Matching**: `pathsMatch` function (lines 181-185) handles cross-platform path comparison by normalizing both Windows and Unix paths.

**Diff View Detection**: Extension detects if current tab is a diff view by checking for `modified` and `original` properties on the tab input (lines 278-285).

**Tab State Validation** (lines 294-364): Critical logic that prevents focusing orphaned tabs:
- "(Index)" tabs should only be used for staged files
- "(Working Tree)" tabs should only be used for unstaged files
- Regular file tabs are only valid for untracked files

**Cursor Position Awareness** (lines 448-461): When pressing F7 in a regular file tab, the extension:
1. Records current cursor line
2. Opens the diff view
3. Restores cursor position
4. Navigates to next/previous change from that position

### Flags Pattern

Navigation behavior is controlled via flags (lines 3-9):
- `Flags.allRepos`: Search across all repos vs current repo only
- `Flags.backwards`: Navigate backwards vs forwards
- `Flags.file`: Skip to next/previous file vs navigate change-by-change

Commands pass different flag combinations to the single `goToNext` function.

## Building and Testing

The extension uses webpack to bundle TypeScript into a single `dist/extension.js` file. The `vscode:prepublish` script ensures the extension is properly packaged before publishing.

To test locally:
1. Run `npm run watch` to start the TypeScript compiler in watch mode
2. Press F5 in VSCode to launch Extension Development Host
3. Open a git repository with changes and test navigation with F7

## Code Style Notes

- Uses single quotes for strings
- `@typescript-eslint/no-explicit-any` is disabled because VS Code Git API types are loosely typed
- Prefer `let` over `const` (prefer-const is disabled)
