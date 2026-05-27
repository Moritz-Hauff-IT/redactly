export type EngineStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface EngineState {
  status: EngineStatus;
  progress: number;
  message: string;
}

function createEngineStore() {
  let state = $state<EngineState>({
    status: 'idle',
    progress: 0,
    message: '',
  });

  return {
    get status() {
      return state.status;
    },
    get progress() {
      return state.progress;
    },
    get message() {
      return state.message;
    },
    setStatus(s: EngineStatus) {
      state.status = s;
    },
    setProgress(n: number, msg?: string) {
      state.progress = n;
      if (msg !== undefined) state.message = msg;
    },
  };
}

export const engineStore = createEngineStore();
