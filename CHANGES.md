# Changes from Original Fork

This document describes the changes made since forking from [go-to-next-change](https://github.com/alfredbirk/go-to-next-change).

## Key Features Added

### Multi-Repo Workspace Support
- **Full multi-repo support**: Works with multi-root workspaces
- **Repo ordering**: Files are ordered by workspace folder order (matching VS Code's SCM view), then sorted within each repo
- **Single repo mode**: Use F7/Shift+F7 to cycle through changes in the current repo only
- **All repos mode**: Use Ctrl+F7/Ctrl+Shift+F7 to cycle through changes across all repos

### File-Level Navigation
- **Jump to next/previous file**: Use Alt+F7/Alt+Shift+F7 to skip to the next/previous changed file (ignoring remaining changes in current file)
- **All repos file navigation**: Use Ctrl+Alt+F7/Ctrl+Alt+Shift+F7 to jump between files across all repos
- **Quick file review**: Useful when you want to quickly scan which files have changes without reviewing every individual change

### Complete Change Coverage
- **Staged changes**: Cycles through files in "Staged Changes" (Index)
- **Unstaged changes**: Cycles through files in "Changes" (Working Tree)
- **Untracked files**: New files not yet tracked by Git are included in cycling
- **All change types**: Modified, added, deleted, renamed files are all supported

### Improved Cycling Behavior
- **Wrap-around cycling**: When reaching the last change, automatically wraps to the first change (and vice versa)
- **Wrap notifications**: Shows a notification when wrapping ("Wrapped to first change in repo" or "Wrapped to first change (all repos)")
- **No random file focus**: Previously, focus would jump to a random open file when all changes were cycled - now it wraps seamlessly

### Smart Tab Handling
- **Pinned tab support**: Pinned (non-preview) diff tabs are preserved and focused when cycling reaches them
- **Preview tab cleanup**: Preview tabs are automatically closed when switching to pinned tabs, keeping the tab bar clean
- **No flicker**: Uses direct tab reference closing to avoid focus flicker when cleaning up preview tabs
- **Non-changed files preserved**: Regular files that aren't part of the changes list won't be closed
- **Orphaned tab detection**: Ignores stale tabs (e.g., a staged "(Index)" diff tab for a file that has been unstaged)

### Cursor Position Awareness
- **Start from current position**: When pressing F7 in a regular file tab (not diff) that has changes, opens the diff at your current cursor position
- **Search from cursor**: Finds the next/previous change from where you are, not from the start of the file
- **Pinned tab navigation**: When jumping to a pinned diff tab, cursor moves to start/end of file and navigates to first/last change

### New File Handling
- **Untracked files included**: New files (not yet added to Git) are included in the cycling
- **No diff for new files**: Since new files have no previous version, they open as regular files and F7 moves to the next change
- **Pinned new file tabs**: Pinned tabs for new files are correctly detected and focused

### Robustness
- **Race condition prevention**: Rapid F7 presses are handled gracefully with a navigation lock
- **Stale tab handling**: Orphaned tabs (staged diff for unstaged file, or vice versa) are ignored
- **Path matching**: Robust path comparison handles different path formats (Windows/Unix, with/without leading slash)

## Removed Features

- **Revert and save (Alt+Q)**: Removed to keep the extension focused on navigation only

## Known Limitations

- **SCM "Staged Changes" selection**: VS Code doesn't sync the selection in "Staged Changes" when opening a staged file programmatically (VS Code limitation)
