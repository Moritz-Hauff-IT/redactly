<script lang="ts">
  import {
    parseFile,
    UnsupportedFormatError,
    PdfWorkerNotConfiguredError,
  } from '@de-pii/core/parsers';
  import { inputStore } from '../stores/inputStore.svelte.js';
  import { detectionStore } from '../stores/detectionStore.svelte.js';
  import { errorStore } from '../stores/errorStore.svelte.js';
  import HighlightedInput from './HighlightedInput.svelte';

  interface Props {
    onchange?: () => void;
    onmask?: () => void;
    isAnalyzing?: boolean;
    onZip?: (file: File) => void;
  }

  const { onchange, onmask, isAnalyzing = false, onZip }: Props = $props();

  let fileInputEl = $state<HTMLInputElement | null>(null);
  let isDragOver = $state(false);

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
      const result = await parseFile(file);
      inputStore.set({
        text: result.text,
        filename: file.name,
        format: result.meta.format,
        bytes: file.size,
      });
      onchange?.();
    } catch (err) {
      if (err instanceof UnsupportedFormatError) {
        errorStore.show(
          `Format nicht unterstützt: ${file.name}. Erlaubt: .txt .md .eml .pdf .docx .zip`
        );
      } else if (err instanceof PdfWorkerNotConfiguredError) {
        errorStore.show('PDF-Worker nicht konfiguriert. Seite neu laden und erneut versuchen.');
      } else {
        errorStore.show(`Fehler beim Parsen: ${err instanceof Error ? err.message : 'Unbekannt'}`);
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
    onchange?.();
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
    onchange?.();
  }

  function handleTextChange(value: string) {
    inputStore.text = value;
    onchange?.();
  }
</script>

<div class="pane">
  <div class="pane-head">
    <span class="pane-title">
      {inputStore.filename ? inputStore.filename : 'eingabe'}
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
          {inputStore.text.length} chars
        </span>
      {/if}
      <button class="btn-ghost" onclick={loadSample} title="Beispieltext laden">beispiel</button>
      <button class="btn-ghost" disabled={!inputStore.text} onclick={clearInput}>leeren</button>
    </div>
  </div>

  <!-- Textarea + drop zone -->
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
      <div class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
        <span
          class="font-[family-name:var(--font-mono)] text-[12px] font-medium text-[color:var(--color-accent)]"
        >
          → Datei hier ablegen zum Parsen
        </span>
      </div>
    {/if}

    <HighlightedInput
      text={inputStore.text}
      entities={detectionStore.entities}
      oninput={handleTextChange}
    />
  </div>

  <!-- Bottom toolbar: file upload + primary mask button -->
  <div
    class="flex items-center gap-3 border-t border-[color:var(--color-rule)] bg-[color:var(--color-bg)] px-4 py-3"
  >
    <input
      bind:this={fileInputEl}
      type="file"
      accept=".txt,.md,.eml,.pdf,.docx,.zip"
      class="sr-only"
      onchange={handleFileChange}
      aria-label="Datei auswählen"
    />
    <button class="btn-ghost" onclick={() => fileInputEl?.click()}>↑ datei</button>
    <span
      class="font-[family-name:var(--font-mono)] text-[10.5px] text-[color:var(--color-ink-mute)]"
    >
      .txt .md .eml .pdf .docx .zip
    </span>

    <button
      type="button"
      data-testid="mask-button"
      class="btn-primary ml-auto"
      disabled={!inputStore.text.trim() || isAnalyzing}
      onclick={() => onmask?.()}
      title="Erkennt PII und maskiert (⌘↵)"
    >
      {#if isAnalyzing}
        <svg class="h-3.5 w-3.5 animate-spin" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle
            cx="8"
            cy="8"
            r="6"
            stroke="currentColor"
            stroke-opacity="0.35"
            stroke-width="2"
          />
          <path
            d="M14 8a6 6 0 00-6-6"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
        Analysiere …
      {:else}
        <span>Maskieren</span>
        <span class="kbd">⌘↵</span>
      {/if}
    </button>
  </div>
</div>
