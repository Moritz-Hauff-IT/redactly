<script lang="ts">
  import { errorStore } from '../stores/errorStore.svelte.js';
</script>

{#if errorStore.message}
  <div
    role="alert"
    aria-live="assertive"
    class="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-red-700 bg-red-900/90 px-4 py-3 text-sm text-red-100 shadow-xl backdrop-blur-sm"
  >
    <svg
      class="h-4 w-4 flex-shrink-0 text-red-300"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fill-rule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
        clip-rule="evenodd"
      />
    </svg>
    <span class="flex-1">{errorStore.message}</span>
    <button
      class="ml-2 rounded p-0.5 text-red-300 transition-colors hover:bg-red-800 hover:text-red-100"
      onclick={() => errorStore.clear()}
      aria-label="Dismiss notification"
    >
      <svg
        class="h-4 w-4"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
        />
      </svg>
    </button>
  </div>
{/if}
