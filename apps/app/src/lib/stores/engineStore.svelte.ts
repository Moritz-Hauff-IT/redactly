export type EngineStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface EngineState {
  status: EngineStatus;
  progress: number;
  message: string;
}

function createEngineState(): EngineState {
  return { status: 'idle', progress: 0, message: '' };
}

function createEngineStore() {
  let nerState = $state<EngineState>(createEngineState());
  let webllmState = $state<EngineState>(createEngineState());

  return {
    // ── NER sub-store ──────────────────────────────────────────────────────
    get ner(): EngineState {
      return nerState;
    },

    // ── WebLLM sub-store ───────────────────────────────────────────────────
    get webllm(): EngineState {
      return webllmState;
    },

    // ── NER helpers ────────────────────────────────────────────────────────
    setNerStatus(s: EngineStatus) {
      nerState.status = s;
    },
    setNerProgress(n: number, msg?: string) {
      nerState.progress = n;
      if (msg !== undefined) nerState.message = msg;
    },

    // ── WebLLM helpers ─────────────────────────────────────────────────────
    setWebllmStatus(s: EngineStatus) {
      webllmState.status = s;
    },
    setWebllmProgress(n: number, msg?: string) {
      webllmState.progress = n;
      if (msg !== undefined) webllmState.message = msg;
    },

    // ── Legacy flat API (kept for backwards-compat with NER loader) ─────────
    /** @deprecated Use setNerStatus() */
    setStatus(s: EngineStatus) {
      nerState.status = s;
    },
    /** @deprecated Use setNerProgress() */
    setProgress(n: number, msg?: string) {
      nerState.progress = n;
      if (msg !== undefined) nerState.message = msg;
    },
    /** @deprecated Use engineStore.ner.status */
    get status(): EngineStatus {
      return nerState.status;
    },
    /** @deprecated Use engineStore.ner.progress */
    get progress(): number {
      return nerState.progress;
    },
    /** @deprecated Use engineStore.ner.message */
    get message(): string {
      return nerState.message;
    },
  };
}

export const engineStore = createEngineStore();
