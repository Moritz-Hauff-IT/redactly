/**
 * Tiny shared UI store for app-shell state that more than one island needs.
 * Currently just the workspace mode (redact / restore), which the sidebar
 * navigation sets and the page content reads.
 */

export type WorkspaceMode = 'redact' | 'restore';

function createUiStore() {
  let mode = $state<WorkspaceMode>('redact');

  return {
    get mode(): WorkspaceMode {
      return mode;
    },
    setMode(next: WorkspaceMode): void {
      mode = next;
    },
  };
}

export const uiStore = createUiStore();
