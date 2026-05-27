import type { RestoreResult } from '@de-pii/core/restorer';

interface RestoreState {
  input: string;
  result: RestoreResult | null;
}

function createRestoreStore() {
  let state = $state<RestoreState>({ input: '', result: null });

  return {
    get input() {
      return state.input;
    },
    get result() {
      return state.result;
    },
    setInput(s: string) {
      state.input = s;
    },
    setResult(r: RestoreResult) {
      state.result = r;
    },
    clear() {
      state.input = '';
      state.result = null;
    },
  };
}

export const restoreStore = createRestoreStore();
