function createErrorStore() {
  let message = $state<string | null>(null);
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    get message() {
      return message;
    },

    show(msg: string, durationMs = 5000) {
      message = msg;
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        message = null;
        timer = null;
      }, durationMs);
    },

    clear() {
      message = null;
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}

export const errorStore = createErrorStore();
