<script lang="ts">
  import { inputStore } from '../stores/inputStore.svelte.js';
  import { mappingStore } from '../stores/mappingStore.svelte.js';
  import { errorStore } from '../stores/errorStore.svelte.js';
  import { t } from '$lib/i18n/locale.svelte.js';

  interface Props {
    maskedText: string;
    /** When true, render bare (no outer pane card / header) so the component
     * can sit flush inside another container — e.g. the workspace bridge. */
    embedded?: boolean;
  }

  const { maskedText, embedded = false }: Props = $props();

  let copied = $state(false);
  let textPreviewOpen = $state(false);

  const isFileMode = $derived(inputStore.filename !== null);

  const outputFilename = $derived.by(() => {
    const fmt = inputStore.format ?? 'txt';
    const baseName = inputStore.filename ? inputStore.filename.replace(/\.[^.]+$/, '') : 'masked';
    return `${baseName}-masked.${fmt}`;
  });

  async function copyToClipboard() {
    if (!maskedText) return;
    try {
      await navigator.clipboard.writeText(maskedText);
    } catch (err) {
      // Some browsers/contexts (cross-origin iframes, missing permission)
      // reject clipboard writes. Surface as a console warning rather than
      // failing silently — the user still sees the "copied" pulse so the
      // click felt responsive, but they may need to copy manually.
      // eslint-disable-next-line no-console
      console.warn('[MaskedPane] clipboard write failed', err);
    }
    copied = true;
    setTimeout(() => {
      copied = false;
    }, 2000);
  }

  async function downloadMasked() {
    if (!maskedText) return;
    const fmt = inputStore.format ?? 'txt';
    const baseName = inputStore.filename ? inputStore.filename.replace(/\.[^.]+$/, '') : 'masked';
    const rawBytes = inputStore.rawBytes;
    const mapping = mappingStore.get();

    try {
      const { writeAsFormat, writeAsRedactedFormat } = await import('@redactly/core/parsers');

      // Layout-preserving path: we have the original file bytes AND a mapping
      // of detected entities → placeholders. Overlay redactions onto the
      // original document instead of producing a plain-text dump.
      const canRedact =
        rawBytes &&
        mapping &&
        (fmt === 'pdf' ||
          fmt === 'docx' ||
          fmt === 'xlsx' ||
          fmt === 'pptx' ||
          fmt === 'png' ||
          fmt === 'jpg' ||
          fmt === 'webp');

      const { blob, filename } = canRedact
        ? await writeAsRedactedFormat(rawBytes, maskedText, mapping, fmt, baseName)
        : await writeAsFormat(maskedText, fmt, baseName);

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      errorStore.show(t('error_download', { message: msg }));
      // eslint-disable-next-line no-console
      console.error('[MaskedPane] download failed', err);
    }
  }
</script>

{#snippet controls()}
  {#if !isFileMode}
    <button class="btn-ghost" disabled={!maskedText} onclick={downloadMasked}>
      {t('btn_download')}
    </button>
    <button
      data-testid="copy-masked"
      class="btn-ghost"
      disabled={!maskedText}
      onclick={copyToClipboard}
    >
      {#if copied}
        <span data-testid="copy-feedback" class="text-[color:var(--color-ok)]"
          >{t('btn_copied')}</span
        >
      {:else}
        {t('btn_copy')}
      {/if}
    </button>
  {/if}
{/snippet}

{#snippet content()}
  {#if isFileMode}
    {#if maskedText}
      <div class="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <div
          class="flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)]"
        >
          <svg
            class="h-8 w-8"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <path d="M7 10l5 5 5-5" />
            <path d="M12 15V3" />
          </svg>
        </div>
        <div>
          <p
            class="font-[family-name:var(--font-serif)] text-[16px] font-medium text-[color:var(--color-ink)]"
          >
            {t('file_ready_title')}
          </p>
          <p
            class="mt-1 font-[family-name:var(--font-mono)] text-[11px] text-[color:var(--color-ink-mute)]"
          >
            {outputFilename}
          </p>
        </div>
        <button class="btn-primary mt-2" onclick={downloadMasked}>↓ {t('btn_download')}</button>
        <div class="mt-2 flex items-center gap-2">
          <button class="btn-ghost" onclick={copyToClipboard}>
            {copied ? t('file_text_copied') : t('file_text_copy')}
          </button>
          <button class="btn-ghost" onclick={() => (textPreviewOpen = !textPreviewOpen)}>
            {textPreviewOpen ? t('file_preview_hide') : t('file_preview_show')}
          </button>
        </div>
        {#if textPreviewOpen}
          <pre
            data-testid="masked-output"
            class="mt-3 max-h-64 w-full overflow-auto rounded border border-[color:var(--color-rule)] bg-[color:var(--color-bg)] p-3 text-left font-[family-name:var(--font-mono)] text-[12px] leading-[1.6] whitespace-pre-wrap text-[color:var(--color-ink)]">{maskedText}</pre>
        {/if}
      </div>
    {:else}
      <div class="flex flex-1 items-center justify-center p-8 text-center">
        <span class="text-[color:var(--color-ink-mute)] italic">{t('output_empty_file')}</span>
      </div>
    {/if}
  {:else}
    <div
      data-testid="masked-output"
      class="flex-1 overflow-auto px-4 py-3.5 font-[family-name:var(--font-mono)] text-[13px] leading-[1.65] whitespace-pre-wrap text-[color:var(--color-ink)]"
    >
      {#if maskedText}
        {maskedText}
      {:else}
        <span class="text-[color:var(--color-ink-mute)] italic">{t('output_empty_text')}</span>
      {/if}
    </div>
  {/if}
{/snippet}

{#if embedded}
  <div class="flex min-h-0 flex-1 flex-col">
    {#if !isFileMode}
      <div
        class="flex items-center justify-end gap-2 border-b border-[color:var(--color-rule)] px-3 py-2"
      >
        {@render controls()}
      </div>
    {/if}
    {@render content()}
  </div>
{:else}
  <div class="pane">
    <div class="pane-head">
      <span class="pane-title">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        {t('output_title')}
      </span>
      <div class="flex items-center gap-2">{@render controls()}</div>
    </div>
    {@render content()}
  </div>
{/if}
