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
  }

  const { onchange }: Props = $props();

  let fileInputEl = $state<HTMLInputElement | null>(null);
  let isDragOver = $state(false);

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function processFile(file: File) {
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
          `Unsupported file format: ${file.name}. Supported: .txt, .md, .eml, .pdf, .docx`
        );
      } else if (err instanceof PdfWorkerNotConfiguredError) {
        errorStore.show('PDF worker not configured. Please refresh the page and try again.');
      } else {
        errorStore.show(
          `Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}`
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

  function clearFile() {
    inputStore.reset();
    detectionStore.clear();
    onchange?.();
  }

  function handleTextChange(value: string) {
    inputStore.text = value;
    onchange?.();
  }
</script>

<div class="flex h-full flex-col gap-2">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <span class="text-sm font-medium text-slate-300">
      {inputStore.filename ? inputStore.filename : 'Input text'}
    </span>
    <div class="flex items-center gap-2">
      {#if inputStore.filename}
        <span
          class="inline-flex items-center rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-300"
        >
          {inputStore.format ?? 'txt'}
        </span>
      {/if}
      <span class="text-xs text-slate-500">
        {inputStore.text.length} chars · {formatBytes(inputStore.bytes)}
      </span>
    </div>
  </div>

  <!-- File info chip + Clear button -->
  {#if inputStore.filename}
    <div
      class="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800/50 px-3 py-2"
    >
      <svg
        class="h-4 w-4 flex-shrink-0 text-slate-400"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          d="M3 3.5A1.5 1.5 0 014.5 2h6.879a1.5 1.5 0 011.06.44l4.122 4.12A1.5 1.5 0 0117 7.622V16.5a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 013 16.5v-13z"
        />
      </svg>
      <span class="flex-1 truncate text-xs text-slate-300">{inputStore.filename}</span>
      <span class="text-xs text-slate-500">{formatBytes(inputStore.bytes)}</span>
      <button
        class="rounded px-2 py-0.5 text-xs text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200"
        onclick={clearFile}
      >
        Clear file
      </button>
    </div>
  {/if}

  <!-- Drop zone + textarea area -->
  <div
    class="relative flex flex-1 flex-col rounded-md border transition-colors {isDragOver
      ? 'border-blue-500 ring-2 ring-blue-500/30'
      : 'border-slate-700'} bg-slate-900"
    role="region"
    aria-label="File drop zone"
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
  >
    {#if isDragOver}
      <div
        class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-md bg-blue-900/30"
      >
        <span class="text-sm font-medium text-blue-300">Drop file to parse</span>
      </div>
    {/if}

    <HighlightedInput
      text={inputStore.text}
      entities={detectionStore.entities}
      oninput={handleTextChange}
    />
  </div>

  <!-- File picker toolbar -->
  <div class="flex items-center gap-2">
    <input
      bind:this={fileInputEl}
      type="file"
      accept=".txt,.md,.eml,.pdf,.docx"
      class="sr-only"
      onchange={handleFileChange}
      aria-label="Choose file to parse"
    />
    <button
      class="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-slate-100"
      onclick={() => fileInputEl?.click()}
    >
      <svg
        class="h-3.5 w-3.5"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 101.09 1.03L9.25 4.636v8.614z"
        />
        <path
          d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z"
        />
      </svg>
      Upload file
    </button>
    <span class="text-xs text-slate-600">or drag &amp; drop · .txt .md .eml .pdf .docx</span>
  </div>
</div>
