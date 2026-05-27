<script lang="ts">
  import { inputStore } from '../stores/inputStore.svelte.js';

  interface Props {
    maskedText: string;
  }

  const { maskedText }: Props = $props();

  let copied = $state(false);

  async function copyToClipboard() {
    if (!maskedText) return;
    await navigator.clipboard.writeText(maskedText);
    copied = true;
    setTimeout(() => {
      copied = false;
    }, 2000);
  }

  function downloadMasked() {
    if (!maskedText) return;

    // Determine extension based on input format
    const fmt = inputStore.format;
    const ext = fmt === 'md' ? 'md' : 'txt';
    const baseName = inputStore.filename ? inputStore.filename.replace(/\.[^.]+$/, '') : 'masked';
    const filename = `${baseName}-masked.${ext}`;

    const blob = new Blob([maskedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<div class="flex h-full flex-col gap-2">
  <div class="flex items-center justify-between">
    <span class="text-sm font-medium text-slate-300">Masked output</span>
    <div class="flex gap-2">
      <button
        class="rounded px-3 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!maskedText}
        onclick={downloadMasked}
        aria-label="Download masked text"
      >
        Download
      </button>
      <button
        class="rounded px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40
          {copied ? 'bg-green-700 text-green-100' : 'text-slate-300 hover:bg-slate-700'}"
        disabled={!maskedText}
        onclick={copyToClipboard}
        aria-label={copied ? 'Copied to clipboard' : 'Copy masked text to clipboard'}
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  </div>
  <pre
    class="min-h-64 flex-1 overflow-auto rounded-md border border-slate-700 bg-slate-900 p-3 font-mono text-sm text-slate-100 whitespace-pre-wrap">{maskedText ||
      'Masked text will appear here...'}</pre>
</div>
