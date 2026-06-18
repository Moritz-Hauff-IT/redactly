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
  btn_mask_llm_chunk: {
    de: 'LLM-Analyse {current}/{total} …',
    en: 'LLM analysis {current}/{total}…',
  },
  btn_mask_loading: { de: 'lädt {detector} …', en: 'loading {detector}…' },
  btn_mask_waiting_for: {
    de: 'Warte bis {detector} fertig geladen ist',
    en: 'Waiting for {detector} to finish loading',
  },
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

  // ---- App chrome ----
  app_brand_tagline: {
    de: 'local redaction · läuft in deinem Browser',
    en: 'local redaction · runs in your browser',
  },
  app_settings: { de: 'Einstellungen', en: 'Settings' },
  app_settings_open: { de: 'Einstellungen öffnen', en: 'Open settings' },
  app_settings_close: { de: 'Schließen', en: 'Close' },

  // ---- Top-bar reassurance chips ----
  chip_runtime: { de: 'läuft im Browser', en: 'runs in browser' },
  chip_server: { de: 'kein Server', en: 'no server' },
  chip_telemetry: { de: 'keine Telemetrie', en: 'no telemetry' },

  // ---- Workspace (mockup-style) ----
  ws_original: { de: 'Original', en: 'Original' },
  ws_tab_mask: { de: 'Maskiert → an die KI', en: 'Masked → to the AI' },
  ws_tab_restore: { de: 'KI-Antwort → zurück', en: 'AI reply → back' },
  ws_inspector: { de: 'Erkannte Daten', en: 'Detected data' },
  ws_vault_local: { de: '🔒 lokal', en: '🔒 local' },
  ws_status: { de: 'Status', en: 'Status' },
  ws_state_original: { de: 'original', en: 'original' },
  ws_state_masked: { de: 'maskiert', en: 'masked' },
  ws_btn_mask: { de: 'Maskieren', en: 'Mask' },
  ws_btn_redact: { de: 'Schwärzen', en: 'Redact' },
  ws_btn_restore: { de: 'Wiederherstellen', en: 'Restore' },
  ws_state_redacted: { de: 'geschwärzt', en: 'redacted' },
  ws_analysis_hint: {
    de: 'läuft lokal in deinem Browser — nichts wird hochgeladen',
    en: 'running locally in your browser — nothing is uploaded',
  },

  // ---- ZIP result view (files listed in the panes) ----
  ws_zip_count: { de: '{n} Dateien', en: '{n} files' },
  ws_new_input: { de: 'Neue Eingabe', en: 'New input' },
  ws_zip_all: { de: 'Alle als ZIP', en: 'All as ZIP' },
  ws_zip_dl_file: { de: 'Diese Datei herunterladen', en: 'Download this file' },
  ws_zip_nopreview: {
    de: 'Keine Textvorschau für diese Datei.',
    en: 'No text preview for this file.',
  },
  ws_zip_kept_note: {
    de: 'Unverändert übernommen — keine Maskierung.',
    en: 'Kept unchanged — not masked.',
  },
  ws_zip_skipped_note: { de: 'Aus dem Archiv weggelassen.', en: 'Left out of the archive.' },
  ws_zip_failed_note: {
    de: 'Verarbeitung fehlgeschlagen — Original übernommen.',
    en: 'Processing failed — original kept.',
  },
  ws_act_masked: { de: 'maskiert', en: 'masked' },
  ws_act_kept: { de: 'behalten', en: 'kept' },
  ws_act_skipped: { de: 'übersprungen', en: 'skipped' },
  ws_act_failed: { de: 'Fehler', en: 'failed' },

  // ---- Mapping save / load ----
  map_export: { de: 'Mapping sichern', en: 'Save mapping' },
  map_import: { de: 'Mapping laden', en: 'Load mapping' },
  map_export_warn: {
    de: 'Achtung: diese Datei enthält die Original-Daten im Klartext — sicher aufbewahren, nur zum Wiederherstellen verwenden.',
    en: 'Heads up: this file holds the original data in clear text — keep it safe, use it only to restore.',
  },
  map_import_ok: {
    de: '{n} Zuordnungen geladen — du kannst jetzt wiederherstellen.',
    en: '{n} mappings loaded — you can restore now.',
  },
  map_import_err: {
    de: 'Mapping konnte nicht geladen werden: {message}',
    en: 'Could not load mapping: {message}',
  },

  // ---- Caution banner ----
  caution_lead: { de: 'Bitte selbst gegenprüfen.', en: 'Always double-check yourself.' },
  caution_body: {
    de: 'Regex, NER und KI erkennen PII nicht zu 100 %. Prüfe den maskierten Text vor dem Weitergeben — nur so bist du sicher, dass nichts Sensibles übrig bleibt.',
    en: 'Regex, NER and AI don’t catch PII with 100 % certainty. Review the masked text before sharing it — that’s the only way to be sure nothing sensitive slips through.',
  },
  caution_dismiss: { de: 'Hinweis ausblenden', en: 'Dismiss notice' },

  // ---- Footer (legal) ----
  footer_imprint: { de: 'Impressum', en: 'Imprint' },
  footer_privacy: { de: 'Datenschutz', en: 'Privacy' },
  footer_terms: { de: 'Nutzungsbedingungen', en: 'Terms' },

  // ---- Detection review ----
  detection_title: { de: 'Erkannte Entities', en: 'Detected entities' },
  detection_none: {
    de: 'Noch keine Entities erkannt — klick „Maskieren" um zu starten.',
    en: 'No entities yet — click "Mask" to start.',
  },
  detection_toggle_on: { de: 'aktiv', en: 'on' },
  detection_toggle_off: { de: 'aus', en: 'off' },
  detection_count: { de: '{n} erkannt', en: '{n} detected' },

  // ---- Restore pane ----
  restore_title: { de: 'wiederherstellung', en: 'restore' },
  restore_input_placeholder: {
    de: 'LLM-Antwort hier einfügen — Platzhalter werden mit Original-Werten ersetzt',
    en: "Paste the LLM's reply here — placeholders are swapped for original values",
  },
  restore_output_title: { de: 'Wiederhergestellt', en: 'Restored' },
  restore_output_empty: {
    de: 'Die wiederhergestellte Version landet hier.',
    en: 'The restored text will appear here.',
  },
  restore_unknown_placeholder_warn: {
    de: '{n} Platzhalter konnten nicht aufgelöst werden (waren nicht im Mapping).',
    en: "{n} placeholders couldn't be resolved (they weren't in the mapping).",
  },

  // ---- ZIP review ----
  zip_review_title: { de: 'ZIP-Verarbeitung', en: 'ZIP review' },
  zip_review_subtitle: {
    de: 'Entscheide pro Datei, was passieren soll.',
    en: 'Choose what to do for each file.',
  },
  zip_action_mask: { de: 'maskieren', en: 'mask' },
  zip_action_keep: { de: 'behalten', en: 'keep' },
  zip_action_skip: { de: 'weglassen', en: 'skip' },
  zip_bulk_all_mask: { de: 'alle maskieren', en: 'mask all' },
  zip_bulk_all_keep: { de: 'alle behalten', en: 'keep all' },
  zip_bulk_all_skip: { de: 'alle weglassen', en: 'skip all' },
  zip_btn_apply: { de: 'Plan anwenden', en: 'Apply plan' },
  zip_btn_cancel: { de: 'Abbrechen', en: 'Cancel' },
  zip_progress_running: {
    de: 'Verarbeite {current}/{total}…',
    en: 'Processing {current}/{total}…',
  },
  zip_progress_done: { de: 'Fertig. Download bereit.', en: 'Done. Download ready.' },

  // ---- Highlight overlay ----
  highlight_placeholder: {
    de: 'Text einfügen oder Datei hochladen …',
    en: 'Paste text or upload a file …',
  },

  // ---- Errors / toasts ----
  error_zip_failed: {
    de: 'ZIP-Verarbeitung fehlgeschlagen: {message}',
    en: 'ZIP processing failed: {message}',
  },
  error_mask_failed: {
    de: 'Maskierung fehlgeschlagen: {message}',
    en: 'Masking failed: {message}',
  },
} as const;

export type MessageKey = keyof typeof messages;
export type Locale = 'de' | 'en';
export const LOCALES = ['de', 'en'] as const satisfies readonly Locale[];
export const DEFAULT_LOCALE: Locale = 'de';
