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
  // Copy masked text and open an LLM in a new tab (cross-origin paste isn't
  // possible, so the text is placed on the clipboard for the user to paste).
  copy_and_open: {
    de: 'Maskiert kopieren & {provider} öffnen',
    en: 'Copy masked & open {provider}',
  },
  copy_open_toast: {
    de: 'Maskierter Text kopiert — füge die KI-Antwort danach im Tab „KI-Antwort → zurück" ein.',
    en: 'Masked text copied — paste the AI reply afterwards in the “AI reply → back” tab.',
  },
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
  ws_diff: { de: 'Diff', en: 'Diff' },
  ws_diff_title: {
    de: 'Vorher/Nachher anzeigen — was wurde ersetzt?',
    en: 'Show before/after — what was replaced?',
  },
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
  map_export_enc: { de: 'Verschlüsselt sichern', en: 'Save encrypted' },
  map_export_enc_ok: {
    de: 'Verschlüsseltes Mapping gespeichert — Passwort gut merken, ohne ist es nicht wiederherstellbar.',
    en: 'Encrypted mapping saved — remember the password, without it the data is unrecoverable.',
  },
  pw_export_title: { de: 'Mapping verschlüsseln', en: 'Encrypt mapping' },
  pw_export_body: {
    de: 'Wähle ein Passwort. Die Datei wird lokal mit AES-256-GCM verschlüsselt — ohne Passwort gibt es keine Wiederherstellung.',
    en: 'Choose a password. The file is encrypted locally with AES-256-GCM — there is no recovery without it.',
  },
  pw_import_title: { de: 'Mapping entschlüsseln', en: 'Decrypt mapping' },
  pw_import_body: {
    de: 'Diese Mapping-Datei ist verschlüsselt. Gib das Passwort ein, um sie zu laden.',
    en: 'This mapping file is encrypted. Enter the password to load it.',
  },
  pw_placeholder: { de: 'Passwort', en: 'Password' },
  pw_confirm_placeholder: { de: 'Passwort wiederholen', en: 'Repeat password' },
  pw_mismatch: { de: 'Passwörter stimmen nicht überein', en: 'Passwords do not match' },
  pw_submit: { de: 'Bestätigen', en: 'Confirm' },
  pw_cancel: { de: 'Abbrechen', en: 'Cancel' },

  // ---- Settings profiles ----
  prof_label: { de: 'Profile', en: 'Profiles' },
  prof_intro: {
    de: 'Speichere alle Einstellungen (Kategorien, Begriffe, Strukturregeln, Modus, Empfindlichkeit) als benanntes Profil und wechsle mit einem Klick. Lokal gespeichert.',
    en: 'Save all settings (categories, terms, structural rules, mode, sensitivity) as a named profile and switch in one click. Stored locally.',
  },
  prof_name_placeholder: { de: 'Profilname', en: 'Profile name' },
  prof_save: { de: 'Speichern', en: 'Save' },
  prof_load: { de: 'Laden', en: 'Load' },
  prof_delete: { de: '{name} löschen', en: 'Delete {name}' },
  prof_loaded: { de: 'Profil „{name}" geladen', en: 'Profile “{name}” loaded' },
  prof_saved: { de: 'Profil „{name}" gespeichert', en: 'Profile “{name}” saved' },
  prof_none: { de: 'Noch keine Profile gespeichert.', en: 'No profiles saved yet.' },
  prof_export: { de: 'Profil exportieren', en: 'Export profile' },
  prof_import: { de: 'Profil importieren', en: 'Import profile' },
  prof_import_ok: {
    de: 'Profil „{name}" importiert & angewendet',
    en: 'Profile “{name}” imported & applied',
  },
  prof_import_err: {
    de: 'Profil-Import fehlgeschlagen: {message}',
    en: 'Profile import failed: {message}',
  },

  // ---- Caution banner ----
  caution_lead: { de: 'Bitte selbst gegenprüfen.', en: 'Always double-check yourself.' },
  caution_body: {
    de: 'Regex, NER und KI erkennen PII nicht zu 100 %. Prüfe den maskierten Text vor dem Weitergeben — nur so bist du sicher, dass nichts Sensibles übrig bleibt.',
    en: 'Regex, NER and AI don’t catch PII with 100 % certainty. Review the masked text before sharing it — that’s the only way to be sure nothing sensitive slips through.',
  },
  caution_dismiss: { de: 'Hinweis ausblenden', en: 'Dismiss notice' },

  // ---- Output safety pass (residual leak + round-trip) ----
  safety_residual_lead: {
    de: '{n} mögliche(r) Treffer im maskierten Text',
    en: '{n} possible match(es) left in the masked text',
  },
  safety_residual_body: {
    de: 'Das sieht noch nach echten Daten aus (E-Mail, IBAN, Telefon, Secret). Bitte vor dem Senden prüfen und ggf. die Kategorie aktivieren oder als „immer maskieren" eintragen.',
    en: 'This still looks like real data (email, IBAN, phone, secret). Please review before sending — enable the category or add it as an "always mask" term if needed.',
  },
  safety_roundtrip_lead: {
    de: 'Wiederherstellung evtl. ungenau.',
    en: 'Restore may be inaccurate.',
  },
  safety_roundtrip_body: {
    de: 'Ein Platzhalter kollidiert mit echtem Text — das Zurückwandeln der KI-Antwort könnte nicht exakt sein.',
    en: 'A placeholder collides with real text — restoring the AI reply may not be exact.',
  },

  // ---- First-visit onboarding (enable NER / WebLLM) ----
  onb_lead: { de: 'Bessere Erkennung freischalten', en: 'Unlock better detection' },
  onb_body: {
    de: 'Standardmäßig läuft nur die schnelle Regex-Erkennung. Für Namen, Organisationen & Orte aktiviere NER — und, falls dein Browser WebGPU unterstützt, zusätzlich WebLLM für nahezu vollständige Treffer. Beides lädt einmalig und läuft danach 100 % lokal.',
    en: 'By default only the fast regex detection runs. For names, organisations & places enable NER — and, if your browser supports WebGPU, add WebLLM for near-complete coverage. Both download once and then run 100 % locally.',
  },
  onb_open: { de: 'In den Einstellungen aktivieren', en: 'Enable in settings' },
  onb_dismiss: { de: 'Später', en: 'Later' },

  // ---- Dynamic column picker (CSV / Excel upload) ----
  col_title: { de: 'Spalten immer maskieren?', en: 'Always mask columns?' },
  col_intro: {
    de: 'In „{file}" wurden Tabellen-Spalten erkannt. Wähle die Spalten, die immer sensible Daten enthalten — alle Werte darin werden maskiert.',
    en: 'Detected table columns in “{file}”. Pick the columns that always hold sensitive data — every value in them gets masked.',
  },
  col_rows: { de: '{n} Werte', en: '{n} values' },
  col_apply: { de: 'Übernehmen', en: 'Apply' },
  col_skip: { de: 'Überspringen', en: 'Skip' },
  col_none: { de: 'keine Werte', en: 'no values' },
  col_badge: { de: '{n} Spalte(n) maskiert', en: '{n} column(s) masked' },
  col_edit: { de: 'Spalten wählen', en: 'Choose columns' },
  col_applied: { de: '{cols} Spalte(n) werden maskiert', en: 'Masking {cols} column(s)' },

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
