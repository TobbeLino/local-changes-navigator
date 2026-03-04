import * as vscode from 'vscode';

export const Flags = {
    allRepos: 'allRepos',
    backwards: 'backwards',
    file: 'file',
} as const;

export type Flag = typeof Flags[keyof typeof Flags];

// ============================================================================
// GIT API TYPES
// ============================================================================

interface GitFile {
    uri: vscode.Uri;
    status: number;
}

interface GitRepoState {
    indexChanges: GitFile[];
    workingTreeChanges: GitFile[];
    untrackedChanges?: GitFile[];
}

interface GitRepo {
    rootUri: vscode.Uri;
    state: GitRepoState;
}

interface GitAPI {
    repositories: GitRepo[];
}

interface GitExtension {
    getAPI(version: number): GitAPI;
}

// Prevent rapid-fire race conditions
let isNavigating = false;

/**
 * Creates a navigation command handler with race condition prevention
 */
const createNavigationCommand = (...flags: Flag[]) => {
    return async () => {
        if (!isNavigating) {
            isNavigating = true;
            try {
                await goToNext(...flags);
            } finally {
                isNavigating = false;
            }
        }
    };
};

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(

        // Current repo only (F7 / Shift+F7)
        vscode.commands.registerCommand('local-changes-navigator.next-change',
            createNavigationCommand()),
        vscode.commands.registerCommand('local-changes-navigator.previous-change',
            createNavigationCommand(Flags.backwards)),

        // All repos in the current workspace (Ctrl+F7 / Ctrl+Shift+F7)
        vscode.commands.registerCommand('local-changes-navigator.next-change-all-repos',
            createNavigationCommand(Flags.allRepos)),
        vscode.commands.registerCommand('local-changes-navigator.previous-change-all-repos',
            createNavigationCommand(Flags.allRepos, Flags.backwards)),

        // Next/previous FILE (skip remaining changes in current file)
        // Current repo only (Alt+F7 / Alt+Shift+F7)
        vscode.commands.registerCommand('local-changes-navigator.next-file',
            createNavigationCommand(Flags.file)),
        vscode.commands.registerCommand('local-changes-navigator.previous-file',
            createNavigationCommand(Flags.backwards, Flags.file)),

        // All repos (Ctrl+Alt+F7 / Ctrl+Alt+Shift+F7)
        vscode.commands.registerCommand('local-changes-navigator.next-file-all-repos',
            createNavigationCommand(Flags.allRepos, Flags.file)),
        vscode.commands.registerCommand('local-changes-navigator.previous-file-all-repos',
            createNavigationCommand(Flags.allRepos, Flags.backwards, Flags.file))
    );
}

// ============================================================================
// PATH HELPERS (used by ordering)
// ============================================================================

const normalizePath = (path: string): string => {
    return path.toLowerCase().replace(/\\/g, '/').replace(/^\//, '');
};

// ============================================================================
// FILE ORDERING (same as VS Code's SCM view)
// ============================================================================

const orderFilesForListView = (a: any, b: any): number => {
    const filenameA = normalizePath(a.path).split('/').filter(Boolean);
    const filenameB = normalizePath(b.path).split('/').filter(Boolean);

    for (let i = 0; i < Math.max(filenameA.length, filenameB.length); i++) {
        const partA = filenameA[i];
        const partB = filenameB[i];

        // One path has run out - shorter path (parent) comes first
        if (partA === undefined) return -1;
        if (partB === undefined) return 1;

        if (partA === partB) {
            continue;
        }

        if (
            (i === filenameA.length - 1 && i === filenameB.length - 1) ||
            (i < filenameA.length - 1 && i < filenameB.length - 1 && partA !== partB)
        ) {
            return partA < partB ? -1 : partA > partB ? 1 : 0;
        }

        if (i === filenameA.length - 1) {
            return -1;
        }
        if (i === filenameB.length - 1) {
            return 1;
        }
    }
    return 0;
};

const orderFilesForTreeView = (a: any, b: any): number => {
    const filenameA = normalizePath(a.path).split('/').filter(Boolean);
    const filenameB = normalizePath(b.path).split('/').filter(Boolean);

    for (let i = 0; i < Math.max(filenameA.length, filenameB.length); i++) {
        const partA = filenameA[i];
        const partB = filenameB[i];

        // One path has run out - folder contents (longer path) come first
        if (partA === undefined) return 1;
        if (partB === undefined) return -1;

        if (partA === partB) {
            continue;
        }

        if (
            (i === filenameA.length - 1 && i === filenameB.length - 1) ||
            (i < filenameA.length - 1 && i < filenameB.length - 1 && partA !== partB)
        ) {
            return partA < partB ? -1 : partA > partB ? 1 : 0;
        }

        // A is file at this level, B is folder - folder first
        if (i === filenameA.length - 1) {
            return 1;
        }
        // B is file at this level, A is folder - folder first
        if (i === filenameB.length - 1) {
            return -1;
        }
    }
    return 0;
};

// ============================================================================
// PATH HELPERS
// ============================================================================

const pathsMatch = (path1: string, path2: string): boolean => {
    const n1 = normalizePath(path1);
    const n2 = normalizePath(path2);

    // Exact match
    if (n1 === n2) {
        return true;
    }

    // Check if one path ends with the other, ensuring it's a complete path segment
    // (not a partial match like /foo/bar matching /bar without a separator)
    if (n1.length > n2.length && n1.endsWith(n2)) {
        // n1 is longer, check if n2 is a suffix with path separator
        return n1.charAt(n1.length - n2.length - 1) === '/';
    }

    if (n2.length > n1.length && n2.endsWith(n1)) {
        // n2 is longer, check if n1 is a suffix with path separator
        return n2.charAt(n2.length - n1.length - 1) === '/';
    }

    return false;
};

const getActiveFilePath = async (): Promise<string> => {
    // First try the simple way
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor?.document.uri.path) {
        return activeEditor.document.uri.path;
    }

    // Fallback: use clipboard trick for non-text files
    const originalClipboard = await vscode.env.clipboard.readText();
    await vscode.env.clipboard.writeText('');
    await vscode.commands.executeCommand('workbench.action.files.copyPathOfActiveFile');
    const filePath = await vscode.env.clipboard.readText();
    await vscode.env.clipboard.writeText(originalClipboard);
    return filePath;
};

// ============================================================================
// GIT HELPERS
// ============================================================================

// Represents a file change with its type
interface FileChange {
    uri: vscode.Uri;
    isUntracked: boolean;
    isStaged: boolean;
}

const getGitAPI = (): GitAPI => {
    const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git');
    if (!gitExtension) {
        throw new Error('Git extension not found. Please ensure the Git extension is installed and enabled.');
    }
    const api = gitExtension.exports.getAPI(1);
    if (!api) {
        throw new Error('Unable to access Git API.');
    }
    return api;
};

const getCurrentRepo = async (): Promise<GitRepo | null> => {
    const git = getGitAPI();
    const currentFilePath = await getActiveFilePath();
    if (currentFilePath) {
        const normalizedCurrentPath = normalizePath(currentFilePath);
        return git.repositories.find((repo: GitRepo) =>
            normalizedCurrentPath.startsWith(normalizePath(repo.rootUri.path))
        ) ?? null;
    }
    return null;
};

// Git status codes from VS Code Git extension
const GIT_STATUS_UNTRACKED = 7;

const mapToFileChange = (file: GitFile, isStaged: boolean): FileChange => ({
    uri: file.uri,
    // Check status property: 7 = UNTRACKED in VS Code Git extension
    isUntracked: file.status === GIT_STATUS_UNTRACKED,
    isStaged: isStaged
});

const getFileChangesForRepo = (repo: GitRepo): FileChange[] => {
    if (!repo?.state) {
        return [];
    }
    const indexChanges: FileChange[] = repo.state.indexChanges.map((f: GitFile) => mapToFileChange(f, true));
    const workingTreeChanges: FileChange[] = repo.state.workingTreeChanges.map((f: GitFile) => mapToFileChange(f, false));
    const untrackedChanges: FileChange[] = (repo.state.untrackedChanges || []).map((f: GitFile) => mapToFileChange(f, false));
    return [...indexChanges, ...workingTreeChanges, ...untrackedChanges];
};

const getFileChanges = async (allRepos: boolean = false): Promise<FileChange[]> => {
    const git = getGitAPI();
    // Auto-detect view mode from VS Code's SCM settings (no manual config needed)
    const scmViewMode = vscode.workspace.getConfiguration('scm').get('defaultViewMode');
    const isTreeView = (scmViewMode === 'tree');
    const sortFn = (a: FileChange, b: FileChange) =>
        isTreeView ? orderFilesForTreeView(a.uri, b.uri) : orderFilesForListView(a.uri, b.uri);

    if (allRepos) {
        return git.repositories.flatMap((repo: any) => {
            return getFileChangesForRepo(repo).sort(sortFn);
        });
    } else {
        const currentRepo = await getCurrentRepo();
        const repo = currentRepo || git.repositories[0];
        return getFileChangesForRepo(repo).sort(sortFn);
    }
};

const findCurrentFileIndex = (fileChanges: FileChange[], currentFilename: string): number => {
    return fileChanges.findIndex((file: FileChange) => pathsMatch(file.uri.path, currentFilename));
};

// ============================================================================
// TAB HELPERS
// ============================================================================

const isCurrentTabDiffView = (): boolean => {
    const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
    if (activeTab) {
        const input = activeTab.input as any;
        return !!(input?.modified && input?.original);
    }
    return false;
};

// ============================================================================
// CORE NAVIGATION LOGIC
// ============================================================================

/**
 * Check if a tab label indicates it's a staged (Index) diff
 */
const isIndexDiffTab = (tab: vscode.Tab): boolean => {
    const label = (tab.label || '').toString();
    return label.includes('(Index)');
};

/**
 * Check if a tab label indicates it's an unstaged (Working Tree) diff
 */
const isWorkingTreeDiffTab = (tab: vscode.Tab): boolean => {
    const label = (tab.label || '').toString();
    return label.includes('(Working Tree)');
};

/**
 * Find the pinned tab for a file that we should focus when navigating.
 *
 * Logic:
 * - If there's a pinned DIFF tab for the file that matches the staged/unstaged state → return it
 * - Else if there's a pinned regular file tab AND it's an untracked (new) file → return it
 * - Else return null (no relevant pinned tab)
 *
 * Note: Orphaned tabs (e.g., staged diff for an unstaged file) are ignored.
 */
const findPinnedTabForFile = (fileChange: FileChange): vscode.Tab | null => {
    let pinnedDiffTab: vscode.Tab | null = null;
    let pinnedFileTab: vscode.Tab | null = null;

    for (const tabGroup of vscode.window.tabGroups.all) {
        for (const tab of tabGroup.tabs) {
            if (tab.isPreview) {
                continue;
            }
            const input = tab.input as any;

            // Check for diff tab (has 'modified' and 'original' properties)
            if (input?.modified && input?.original && pathsMatch(input.modified.path, fileChange.uri.path)) {
                // Validate the tab matches the current file state (staged vs unstaged)
                const tabIsStaged = isIndexDiffTab(tab);
                const tabIsUnstaged = isWorkingTreeDiffTab(tab);

                // Only use this tab if it matches the file's current state
                // - Staged file should match "(Index)" tab
                // - Unstaged file should match "(Working Tree)" tab
                // - If we can't determine tab type, accept it as fallback
                if (
                    (fileChange.isStaged && tabIsStaged) ||
                    (!fileChange.isStaged && tabIsUnstaged) ||
                    (!tabIsStaged && !tabIsUnstaged)
                ) {
                    pinnedDiffTab = tab;
                }
                // Skip orphaned tabs (staged tab for unstaged file, or vice versa)
            } else if (input?.uri && !input?.modified && pathsMatch(input.uri.path, fileChange.uri.path)) {
                // Check for regular file tab
                pinnedFileTab = tab;
            }
        }
    }

    // Prefer diff tab
    if (pinnedDiffTab) {
        return pinnedDiffTab;
    }

    // Only return regular file tab if it's an untracked (new) file
    if (pinnedFileTab && fileChange.isUntracked) {
        return pinnedFileTab;
    }

    return null;
};

const showWrapNotification = (message: string, duration: number = 2000) => {
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: message,
        cancellable: false
    }, async () => {
        await new Promise(resolve => setTimeout(resolve, duration));
    });
};

/**
 * Find any preview tab in the active tab group
 */
const findPreviewTab = (): vscode.Tab | undefined => {
    return vscode.window.tabGroups.activeTabGroup.tabs.find(tab => tab.isPreview);
};

/**
 * Open a changed file and navigate to its first/last change.
 */
const openFileAtIndex = async (fileChanges: FileChange[], index: number, backwards: boolean = false): Promise<void> => {
    const targetFileChange = fileChanges[index];
    const currentTab = vscode.window.tabGroups.activeTabGroup.activeTab;
    const isCurrentPreview = currentTab?.isPreview ?? false;
    const targetPinnedTab = findPinnedTabForFile(targetFileChange);

    // Remember if we should close a preview tab after opening
    const shouldClosePreview = isCurrentPreview && targetPinnedTab !== null;

    // Open the new file (this focuses the pinned tab if it exists)
    await vscode.commands.executeCommand('git.openChange', targetFileChange.uri);

    // Find and close any remaining preview tab (get fresh reference after open)
    if (shouldClosePreview) {
        const previewTab = findPreviewTab();
        if (previewTab) {
            try {
                await vscode.window.tabGroups.close(previewTab);
            } catch {
                // Tab might already be closed, ignore
            }
        }
    }

    // If it opened as a diff, go to first/last change
    if (isCurrentTabDiffView()) {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const startLine = backwards ? editor.document.lineCount - 1 : 0;
            const pos = new vscode.Position(startLine, 0);
            editor.selection = new vscode.Selection(pos, pos);
        }
        await vscode.commands.executeCommand(backwards ? 'workbench.action.compareEditor.previousChange' : 'workbench.action.compareEditor.nextChange');
    }
};

/**
 * Main navigation: go to next/previous change or file
 * @param flags - Flags.allRepos: search across all repos
 *              - Flags.backwards: navigate backwards
 *              - Flags.file: skip to next/previous file (ignore remaining changes in current file)
 */
const goToNext = async (...flags: Flag[]) => {
    const f = new Set(flags);
    const allRepos = f.has(Flags.allRepos);
    const backwards = f.has(Flags.backwards);
    const goToNextFile = f.has(Flags.file);

    let fileChanges: FileChange[];
    try {
        fileChanges = await getFileChanges(allRepos);
    } catch (error) {
        vscode.window.showErrorMessage(`Git extension error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return;
    }

    if (fileChanges.length === 0) {
        vscode.window.showInformationMessage(allRepos ? 'No changes found' : 'No changes in current repo');
        return;
    }

    const currentFilename = await getActiveFilePath();
    const currentIndex = currentFilename ? findCurrentFileIndex(fileChanges, currentFilename) : -1;

    // Only try to navigate within the file if not skipping to next file
    if (!goToNextFile) {
        // If we're in a regular file tab (not diff) for a changed file, open its diff first
        let currentLine = -1;
        if (!isCurrentTabDiffView() && currentIndex !== -1) {
            currentLine = vscode.window.activeTextEditor?.selection.active.line || 0;
            await vscode.commands.executeCommand('git.openChange', fileChanges[currentIndex].uri);
        }

        // If we're in a diff view, try to navigate within the file first
        if (isCurrentTabDiffView()) {
            const editor = vscode.window.activeTextEditor;
            if (editor && currentLine !== -1) {
                // Diff view just opened from file tab: Restore cursor position
                const pos = new vscode.Position(currentLine, 0);
                editor.selection = new vscode.Selection(pos, pos);
                editor.revealRange(new vscode.Range(pos, pos));
            }

            // Try navigating within the diff
            const lineBefore = vscode.window.activeTextEditor?.selection.active.line ?? 0;
            await vscode.commands.executeCommand(backwards ? 'workbench.action.compareEditor.previousChange' : 'workbench.action.compareEditor.nextChange');
            const lineAfter = vscode.window.activeTextEditor?.selection.active.line ?? 0;

            // Check if we found a change in the expected direction
            const movedCorrectDirection = backwards ? (lineAfter < lineBefore) : (lineAfter > lineBefore);
            if (movedCorrectDirection) {
                return; // Found a change within the file, done
            }

            // Cursor didn't move in expected direction - either wrapped or at boundary
            // Undo the wrap by going back to where we were
            if (lineAfter !== lineBefore) {
                // VS Code wrapped - undo by navigating the opposite direction
                await vscode.commands.executeCommand(backwards ? 'workbench.action.compareEditor.nextChange' : 'workbench.action.compareEditor.previousChange');
            }
        }
    }

    // No more changes in this file (or skipping) - go to next file
    const len = fileChanges.length;
    let nextIndex: number;
    let wrapped = false;

    if (currentIndex === -1) {
        // Not in a changed file - start from beginning or end
        nextIndex = backwards ? len - 1 : 0;
    } else {
        // Calculate next index with wrap-around using modulo
        nextIndex = (currentIndex + (backwards ? -1 : 1) + len) % len;
        wrapped = backwards ? currentIndex === 0 : currentIndex === len - 1;
    }

    await openFileAtIndex(fileChanges, nextIndex, backwards);

    if (wrapped) {
        const fileOrChange = goToNextFile ? 'file' : 'change';
        if (backwards) {
            showWrapNotification(allRepos ? `↩️ Wrapped to last ${fileOrChange} (all repos)` : `↩️ Wrapped to last ${fileOrChange} in repo`);
        } else {
            showWrapNotification(allRepos ? `↩️ Wrapped to first ${fileOrChange} (all repos)` : `↩️ Wrapped to first ${fileOrChange} in repo`);
        }
    }
};

export function deactivate() {}
