import type { SupportedFormat } from '@de-pii/core/parsers';

export interface InputState {
  text: string;
  filename: string | null;
  format: SupportedFormat | null;
  bytes: number;
  /**
   * Original file bytes (PDF/DOCX uploads). Kept so the masked download
   * can overlay redactions on the original document instead of producing
   * a plain-text dump. `null` when input came from typing/pasting text.
   * Bytes never leave the browser tab.
   */
  rawBytes: Uint8Array | null;
}

function createInputStore() {
  let state = $state<InputState>({
    text: '',
    filename: null,
    format: null,
    bytes: 0,
    rawBytes: null,
  });

  return {
    get text() {
      return state.text;
    },
    set text(value: string) {
      state.text = value;
      state.bytes = new TextEncoder().encode(value).length;
      // Editing text invalidates the original bytes — redaction overlay
      // would no longer match the live text.
      state.rawBytes = null;
    },
    get filename() {
      return state.filename;
    },
    get format() {
      return state.format;
    },
    get bytes() {
      return state.bytes;
    },
    get rawBytes() {
      return state.rawBytes;
    },
    set(update: Partial<InputState>) {
      if (update.text !== undefined) {
        state.text = update.text;
        state.bytes = new TextEncoder().encode(update.text).length;
      }
      if (update.filename !== undefined) state.filename = update.filename;
      if (update.format !== undefined) state.format = update.format;
      if (update.bytes !== undefined) state.bytes = update.bytes;
      if (update.rawBytes !== undefined) state.rawBytes = update.rawBytes;
    },
    reset() {
      state.text = '';
      state.filename = null;
      state.format = null;
      state.bytes = 0;
      state.rawBytes = null;
    },
  };
}

export const inputStore = createInputStore();
