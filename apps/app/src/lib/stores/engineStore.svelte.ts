export type EngineStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface EngineState {
  status: EngineStatus;
  progress: number;
  message: string;
}

/**
 * Per-call progress for the WebLLM detector. Populated while a detect()
 * pass is running so the UI can show e.g. "LLM Chunk 3/5". `total = 0`
 * means no detect-time progress is currently being reported.
 */
export interface DetectProgress {
  current: number;
  total: number;
}

function createEngineState(): EngineState {
  return { status: 'idle', progress: 0, message: '' };
}

function createDetectProgress(): DetectProgress {
  return { current: 0, total: 0 };
}

function createEngineStore() {
  let nerState = $state<EngineState>(createEngineState());
  let webllmState = $state<EngineState>(createEngineState());
  let webllmDetectState = $state<DetectProgress>(createDetectProgress());

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
    // ── WebLLM detect-time progress (chunked text analysis) ─────────────────
    get webllmDetect(): DetectProgress {
      return webllmDetectState;
    },
    setWebllmDetect(current: number, total: number) {
      webllmDetectState.current = current;
      webllmDetectState.total = total;
    },
    resetWebllmDetect() {
      webllmDetectState.current = 0;
      webllmDetectState.total = 0;
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
