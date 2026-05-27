import type { SupportedFormat } from '@de-pii/core/parsers';

export interface InputState {
  text: string;
  filename: string | null;
  format: SupportedFormat | null;
  bytes: number;
}

function createInputStore() {
  let state = $state<InputState>({
    text: '',
    filename: null,
    format: null,
    bytes: 0,
  });

  return {
    get text() {
      return state.text;
    },
    set text(value: string) {
      state.text = value;
      state.bytes = new TextEncoder().encode(value).length;
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
    set(update: Partial<InputState>) {
      if (update.text !== undefined) {
        state.text = update.text;
        state.bytes = new TextEncoder().encode(update.text).length;
      }
      if (update.filename !== undefined) state.filename = update.filename;
      if (update.format !== undefined) state.format = update.format;
      if (update.bytes !== undefined) state.bytes = update.bytes;
    },
    reset() {
      state.text = '';
      state.filename = null;
      state.format = null;
      state.bytes = 0;
    },
  };
}

export const inputStore = createInputStore();
