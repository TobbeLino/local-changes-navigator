# Local Changes Navigator (VSCode extension)

Navigate/cycle through all local changes in the current repo, or across all repositories in your workspace. Cycle through changes with F7, jump between files with Alt+F7. Supports multi-root workspaces.

## Features

### 🔄 Navigate Changes (F7)
- **F7** / **Shift+F7** — Jump to next/previous change (current repo)
- **Ctrl+F7** / **Ctrl+Shift+F7** — Jump to next/previous change (across all repos)
- **Wrap-around cycling** — Automatically wraps to first/last change with notification

### 📁 Navigate Files (Alt+F7)
- **Alt+F7** / **Alt+Shift+F7** — Jump to next/previous changed file (current repo)
- **Ctrl+Alt+F7** / **Ctrl+Alt+Shift+F7** — Jump to next/previous changed file (across all repos)
- Skip remaining changes in current file and move to the next

## How It Works

1. Press **F7** to open the diff view for the first changed file
2. Keep pressing **F7** to navigate through each change
3. When you reach the last change in a file, it automatically jumps to the next file
4. At the end of all changes, it wraps back to the beginning

### Complete Change Coverage - don't miss anything!
- ✅ **Staged changes** — Files in "Staged Changes" (Index)
- ✅ **Unstaged changes** — Files in "Changes" (Working Tree)
- ✅ **Untracked files** — New files not yet tracked by Git
- ✅ **Multi-root workspaces** — Multiple git repositories
- ✅ **List & Tree view** — Works with both SCM view modes

### Smart Tab Handling
- **Pinned tabs preserved** — Your pinned diff tabs stay open and are reused
- **Preview tabs cleaned up** — Temporary preview tabs are closed automatically
- **Cursor position aware** — When pressing F7 in a regular file, opens diff at your cursor position
- **Orphaned tab detection** — Ignores stale tabs (e.g., staged diff for an unstaged file)

## Installation

Search for "Local Changes Navigator" in the VS Code Extensions marketplace, or install from [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=tobbelino.local-changes-navigator).

## Issues & Suggestions

Found a bug or have a feature request? [Open an issue on GitHub](https://github.com/TobbeLino/local-changes-navigator/issues).

## Keybindings

| Command | Windows/Linux | Mac |
|---------|---------------|-----|
| Next change (current repo) | F7 | F7 |
| Previous change (current repo) | Shift+F7 | Shift+F7 |
| Next change (all repos) | Ctrl+F7 | Cmd+F7 |
| Previous change (all repos) | Ctrl+Shift+F7 | Cmd+Shift+F7 |
| Next file (current repo) | Alt+F7 | Alt+F7 |
| Previous file (current repo) | Alt+Shift+F7 | Alt+Shift+F7 |
| Next file (all repos) | Ctrl+Alt+F7 | Cmd+Alt+F7 |
| Previous file (all repos) | Ctrl+Alt+Shift+F7 | Cmd+Alt+Shift+F7 |

## Credits

Originally forked from [go-to-next-change](https://github.com/alfredbirk/go-to-next-change) by [Alfred Birk](https://github.com/alfredbirk).

## License

MIT
