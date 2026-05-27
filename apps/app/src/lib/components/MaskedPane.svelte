<script lang="ts">
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
</script>

<div class="flex h-full flex-col gap-2">
  <div class="flex items-center justify-between">
    <span class="text-sm font-medium text-slate-300">Masked output</span>
    <div class="flex gap-2">
      <button
        class="rounded px-3 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!maskedText}
        onclick={copyToClipboard}
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <!-- Download button placeholder — wired in task 7 -->
    </div>
  </div>
  <pre
    class="min-h-64 flex-1 overflow-auto rounded-md border border-slate-700 bg-slate-900 p-3 font-mono text-sm text-slate-100 whitespace-pre-wrap">{maskedText ||
      'Masked text will appear here...'}</pre>
</div>
