/**
 * Centralised UI strings for the Redactly app.
 *
 * Each key maps to per-locale values. Missing translations fall back to DE
 * at call site (see `locale.svelte.ts → t()`). German is the source-of-truth
 * locale; English values are reviewed translations.
 */

export const messages = {
  // ---- Pane headers & controls ----
  input_title: { de: 'eingabe', en: 'input' },
  input_chars: { de: '{n} chars', en: '{n} chars' },
  output_title: { de: 'ausgabe', en: 'output' },
  btn_example: { de: 'beispiel', en: 'example' },
  btn_clear: { de: 'leeren', en: 'clear' },
  btn_copy: { de: 'kopieren', en: 'copy' },
  btn_copied: { de: 'kopiert ✓', en: 'copied ✓' },
  btn_download: { de: 'download', en: 'download' },
  btn_mask: { de: 'Maskieren', en: 'Mask' },
  btn_mask_analyzing: { de: 'Analysiere …', en: 'Analysing…' },
  btn_file_upload: { de: '↑ datei', en: '↑ file' },
  files_hint: {
    de: 'Dokumente, Text, Code, Configs, Logs, ZIP',
    en: 'Documents, text, code, configs, logs, ZIP',
  },

  // ---- File mode ----
  file_ready_title: { de: 'Maskierte Datei bereit', en: 'Masked file ready' },
  file_mask_hint: {
    de: 'Klick „Maskieren". Der Text wird im Hintergrund analysiert, die maskierte Version landet rechts als gleicher Dateityp zum Download.',
    en: 'Click "Mask". The text is analysed in the background and the masked version appears on the right as a file of the same type, ready to download.',
  },
  file_preview_show: { de: '↓ Text-Vorschau anzeigen', en: '↓ Show text preview' },
  file_preview_hide: { de: '↑ Vorschau ausblenden', en: '↑ Hide preview' },
  file_text_copy: { de: 'Text kopieren', en: 'Copy text' },
  file_text_copied: { de: 'Text kopiert ✓', en: 'Text copied ✓' },
  file_drop_hint: { de: '→ Datei hier ablegen zum Parsen', en: '→ Drop file here to parse' },

  // ---- Empty states ----
  output_empty_text: {
    de: 'redigierter Text erscheint hier — klick „Maskieren" um zu starten',
    en: 'redacted text appears here — click "Mask" to start',
  },
  output_empty_file: {
    de: 'Klick „Maskieren" — die maskierte Datei landet hier',
    en: 'Click "Mask" — the masked file appears here',
  },

  // ---- Errors / toasts ----
  error_unsupported_format: {
    de: 'Format nicht unterstützt: {filename}. Erlaubt: {extensions}',
    en: 'Format not supported: {filename}. Allowed: {extensions}',
  },
  error_pdf_worker: {
    de: 'PDF-Worker nicht konfiguriert. Seite neu laden und erneut versuchen.',
    en: 'PDF worker not configured. Reload the page and try again.',
  },
  error_parse: { de: 'Fehler beim Parsen: {message}', en: 'Parse error: {message}' },
  error_download: {
    de: 'Download fehlgeschlagen: {message}. Versuche es mit „Text kopieren".',
    en: 'Download failed: {message}. Try "Copy text" instead.',
  },
  error_zip_unavailable: {
    de: 'ZIP-Verarbeitung nicht verfügbar in diesem Kontext.',
    en: 'ZIP processing not available in this context.',
  },

  // ---- Language switcher ----
  lang_switch_label: { de: 'Sprache', en: 'Language' },
} as const;

export type MessageKey = keyof typeof messages;
export type Locale = 'de' | 'en';
export const LOCALES = ['de', 'en'] as const satisfies readonly Locale[];
export const DEFAULT_LOCALE: Locale = 'de';
