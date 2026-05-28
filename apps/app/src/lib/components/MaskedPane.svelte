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

  async function downloadMasked() {
    if (!maskedText) return;
    const fmt = inputStore.format ?? 'txt';
    const baseName = inputStore.filename ? inputStore.filename.replace(/\.[^.]+$/, '') : 'masked';

    const { writeAsFormat } = await import('@de-pii/core/parsers');
    const { blob, filename } = await writeAsFormat(maskedText, fmt, baseName);

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<div class="pane">
  <div class="pane-head">
    <span class="pane-title">ausgabe</span>
    <div class="flex items-center gap-2">
      <button class="btn-ghost" disabled={!maskedText} onclick={downloadMasked}>download</button>
      <button
        data-testid="copy-masked"
        class="btn-ghost"
        disabled={!maskedText}
        onclick={copyToClipboard}
      >
        {#if copied}
          <span data-testid="copy-feedback" class="text-[color:var(--color-ok)]">kopiert ✓</span>
        {:else}
          kopieren
        {/if}
      </button>
    </div>
  </div>
  <div
    data-testid="masked-output"
    class="flex-1 overflow-auto px-4 py-3.5 font-[family-name:var(--font-mono)] text-[13px] leading-[1.65] whitespace-pre-wrap text-[color:var(--color-ink)]"
  >
    {#if maskedText}
      {maskedText}
    {:else}
      <span class="text-[color:var(--color-ink-mute)] italic"
        >redigierter Text erscheint hier — klick „Maskieren" um zu starten</span
      >
    {/if}
  </div>
</div>
