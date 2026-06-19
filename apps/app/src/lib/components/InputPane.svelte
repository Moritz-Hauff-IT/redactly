<script lang="ts">
  import {
    parseFile,
    UnsupportedFormatError,
    PdfWorkerNotConfiguredError,
    ACCEPTED_EXTENSIONS,
  } from '@redactly/core/parsers';
  import { inputStore } from '../stores/inputStore.svelte.js';
  import { detectionStore } from '../stores/detectionStore.svelte.js';
  import { errorStore } from '../stores/errorStore.svelte.js';
  import { tableMaskStore } from '../stores/tableMaskStore.svelte.js';
  import { detectColumns } from '$lib/core/columnDetect.js';
  import { t } from '$lib/i18n/locale.svelte.js';
  import HighlightedInput from './HighlightedInput.svelte';
  import ColumnPicker from './ColumnPicker.svelte';

  interface Props {
    onchange?: () => void;
    onZip?: (file: File) => void;
  }

  const { onchange, onZip }: Props = $props();

  let fileInputEl = $state<HTMLInputElement | null>(null);
  let isDragOver = $state(false);
  let pickerOpen = $state(false);

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function processFile(file: File) {
    // ZIP archives route to the multi-file flow instead of the text pane.
    if (/\.zip$/i.test(file.name) || file.type === 'application/zip') {
      if (onZip) {
        onZip(file);
      } else {
        errorStore.show('ZIP-Verarbeitung nicht verfügbar in diesem Kontext.');
      }
      return;
    }
    try {
      // Keep original bytes for layout-preserving formats so the masked
      // download can overlay redactions on the original document. We read
      // before parsing because pdfjs detaches the buffer when it parses.
      const rawBytes = new Uint8Array(await file.arrayBuffer());
      const result = await parseFile(file);
      inputStore.set({
        text: result.text,
        filename: file.name,
        format: result.meta.format,
        bytes: file.size,
        rawBytes,
      });
      onchange?.();

      // Tabular upload → offer dynamic column masking. Detection failures are
      // non-fatal: the file still masks normally, just without the picker.
      try {
        const cols = await detectColumns(result.meta.format, result.text, rawBytes);
        if (cols && cols.length > 0) {
          tableMaskStore.setColumns(cols, file.name);
          pickerOpen = true;
        } else {
          tableMaskStore.clear();
        }
      } catch {
        tableMaskStore.clear();
      }
    } catch (err) {
      if (err instanceof UnsupportedFormatError) {
        errorStore.show(
          t('error_unsupported_format', {
            filename: file.name,
            extensions: ACCEPTED_EXTENSIONS.replace(/,/g, ' '),
          })
        );
      } else if (err instanceof PdfWorkerNotConfiguredError) {
        errorStore.show(t('error_pdf_worker'));
      } else {
        errorStore.show(
          t('error_parse', { message: err instanceof Error ? err.message : 'unknown' })
        );
      }
    }
  }

  function handleFileChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      processFile(file);
      input.value = '';
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    isDragOver = true;
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    isDragOver = false;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragOver = false;
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      processFile(file);
    }
  }

  function clearInput() {
    inputStore.reset();
    detectionStore.clear();
    tableMaskStore.clear();
    onchange?.();
  }

  function applyColumns(refs: string[]) {
    tableMaskStore.setSelected(refs);
    pickerOpen = false;
  }

  function loadSample() {
    inputStore.set({
      text: `Hallo Martin Müller,

anbei die Rechnung über 1.450 € für Q2/2026.
Bitte überweisen auf IBAN DE89 3704 0044 0532 0130 00.

Kontakt bei Rückfragen: martin@müller-gmbh.de oder +49 89 12345678.
Adresse: Marienplatz 8, 80331 München.

Mit freundlichen Grüßen
Sabine Hofmann
Buchhaltung, Müller GmbH
`,
      filename: null,
      format: 'txt',
      bytes: 0,
    });
    tableMaskStore.clear();
    onchange?.();
  }

  function handleTextChange(value: string) {
    inputStore.text = value;
    onchange?.();
  }

  // File mode: when a file is uploaded the text dump is hidden by default.
  // User can expand to inspect/edit the extracted text if needed.
  let textPreviewOpen = $state(false);
  const isFileMode = $derived(inputStore.filename !== null);
</script>

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
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
      {inputStore.filename ? inputStore.filename : t('input_title')}
    </span>
    <div class="flex items-center gap-2">
      {#if inputStore.filename}
        <span
          class="font-[family-name:var(--font-mono)] text-[10.5px] tracking-[0.04em] text-[color:var(--color-ink-mute)] uppercase"
        >
          {inputStore.format ?? 'txt'} · {formatBytes(inputStore.bytes)}
        </span>
      {:else if inputStore.text.length > 0}
        <span
          class="font-[family-name:var(--font-mono)] text-[10.5px] text-[color:var(--color-ink-mute)]"
        >
          {t('input_chars', { n: inputStore.text.length })}
        </span>
      {/if}
      <input
        bind:this={fileInputEl}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        class="sr-only"
        onchange={handleFileChange}
        aria-label="Datei auswählen"
      />
      <button
        class="btn-ghost"
        onclick={() => fileInputEl?.click()}
        title={ACCEPTED_EXTENSIONS.replace(/,/g, ' ')}
      >
        {t('btn_file_upload')}
      </button>
      <button class="btn-ghost" onclick={loadSample} title="Beispieltext laden">
        {t('btn_example')}
      </button>
      <button class="btn-ghost" disabled={!inputStore.text} onclick={clearInput}>
        {t('btn_clear')}
      </button>
    </div>
  </div>

  <!-- Textarea + drop zone (text mode) OR file summary card (file mode) -->
  <div
    class="relative flex flex-1 flex-col transition-colors"
    class:bg-[color:var(--color-accent-soft)]={isDragOver}
    role="region"
    aria-label="Eingabe-Bereich, Dateien ablegen möglich"
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
  >
    {#if isDragOver}
      <div
        class="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5"
      >
        <span
          class="font-[family-name:var(--font-mono)] text-[12px] font-medium text-[color:var(--color-accent)]"
        >
          {t('file_drop_hint')}
        </span>
        <span
          class="font-[family-name:var(--font-mono)] text-[10.5px] text-[color:var(--color-ink-mute)]"
        >
          {t('files_hint')}
        </span>
      </div>
    {/if}

    {#if isFileMode}
      <!-- File card — no text dump unless user explicitly expands -->
      <div class="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <div
          class="flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--color-bg-sunk)] text-[color:var(--color-accent)]"
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
            <path d="M14 3v4a1 1 0 001 1h4" />
            <path d="M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <p class="font-[family-name:var(--font-mono)] text-[13px] text-[color:var(--color-ink)]">
            {inputStore.filename}
          </p>
          <p
            class="mt-1 font-[family-name:var(--font-mono)] text-[11px] text-[color:var(--color-ink-mute)]"
          >
            {inputStore.format ?? 'txt'} · {formatBytes(inputStore.bytes)} · {inputStore.text
              .length}
            Zeichen extrahiert
          </p>
        </div>
        <p class="max-w-xs text-[12px] text-[color:var(--color-ink-soft)]">
          {t('file_mask_hint')}
        </p>
        {#if tableMaskStore.hasColumns}
          <button class="col-badge mt-1" onclick={() => (pickerOpen = true)} type="button">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
            {tableMaskStore.selectedCount > 0
              ? t('col_badge', { n: tableMaskStore.selectedCount })
              : t('col_edit')}
          </button>
        {/if}
        <button class="btn-ghost mt-1" onclick={() => (textPreviewOpen = !textPreviewOpen)}>
          {textPreviewOpen ? t('file_preview_hide') : t('file_preview_show')}
        </button>
        {#if textPreviewOpen}
          <div
            class="mt-3 max-h-64 w-full overflow-auto rounded border border-[color:var(--color-rule)] bg-[color:var(--color-bg)] p-3 text-left"
          >
            <HighlightedInput
              text={inputStore.text}
              entities={detectionStore.entities}
              oninput={handleTextChange}
            />
          </div>
        {/if}
      </div>
    {:else}
      <HighlightedInput
        text={inputStore.text}
        entities={detectionStore.entities}
        oninput={handleTextChange}
      />
    {/if}
  </div>
</div>

<ColumnPicker
  open={pickerOpen}
  filename={tableMaskStore.filename ?? ''}
  columns={tableMaskStore.columns}
  initial={[...tableMaskStore.selected]}
  onapply={applyColumns}
  oncancel={() => (pickerOpen = false)}
/>

<style>
  .col-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 11px;
    border: 1px solid var(--color-accent);
    border-radius: 999px;
    background: var(--color-accent-soft);
    color: var(--color-accent);
    font-size: 11.5px;
    font-weight: 600;
    cursor: pointer;
    transition: filter 0.14s;
  }
  .col-badge:hover {
    filter: brightness(1.06);
  }
</style>
