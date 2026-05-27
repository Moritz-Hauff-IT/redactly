<script lang="ts">
  import { inputStore } from '../stores/inputStore.svelte.js';

  interface Props {
    onchange?: () => void;
  }

  const { onchange }: Props = $props();

  function handleInput(e: Event) {
    const target = e.currentTarget as HTMLTextAreaElement;
    inputStore.text = target.value;
    onchange?.();
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
</script>

<div class="flex h-full flex-col gap-2">
  <div class="flex items-center justify-between">
    <span class="text-sm font-medium text-slate-300">
      {inputStore.filename ? inputStore.filename : 'Input text'}
    </span>
    <span class="text-xs text-slate-500">
      {inputStore.text.length} chars · {formatBytes(inputStore.bytes)}
    </span>
  </div>
  <textarea
    class="min-h-64 flex-1 resize-none rounded-md border border-slate-700 bg-slate-900 p-3 font-mono text-sm text-slate-100 placeholder-slate-600 focus:border-slate-500 focus:outline-none"
    placeholder="Paste or type text here to detect and mask PII..."
    value={inputStore.text}
    oninput={handleInput}
  ></textarea>
</div>
