/**
 * Centralised UI strings for the Redactly landing site.
 *
 * Each key maps to a per-locale value. Missing translations fall back to DE
 * at call site (see `locale.svelte.ts → t()`). German is the source-of-truth
 * locale; English values are reviewed translations.
 *
 * Convention: keys use snake_case grouped by surface (`hero_*`, `nav_*`,
 * `footer_*`, `faq_*`, etc.). Add new strings here first, then use them in
 * components via `t('key_name')`.
 */

export const messages = {
  // ---- Navigation ----
  nav_features: { de: '01 / Features', en: '01 / Features' },
  nav_docs: { de: '02 / Docs', en: '02 / Docs' },
  nav_privacy: { de: '03 / Privacy', en: '03 / Privacy' },
  nav_faq: { de: '04 / FAQ', en: '04 / FAQ' },
  nav_log: { de: '05 / Log', en: '05 / Log' },
  nav_cta_run: { de: 'run.app', en: 'run.app' },
  nav_status_client: { de: 'client-only', en: 'client-only' },
  nav_status_no_telemetry: { de: 'no telemetry', en: 'no telemetry' },
  nav_status_license: { de: 'mit license', en: 'mit license' },
  nav_menu_open: { de: 'Menü öffnen', en: 'Open menu' },

  // ---- Language switcher ----
  lang_switch_label: { de: 'Sprache', en: 'Language' },
  lang_de: { de: 'Deutsch', en: 'German' },
  lang_en: { de: 'Englisch', en: 'English' },

  // ---- Hero ----
  hero_eyebrow: { de: 'Privacy by Design', en: 'Privacy by Design' },
  hero_headline: {
    de: 'PII & Secrets entfernen — bevor du sie an ChatGPT schickst.',
    en: 'Strip PII & secrets — before you send them to ChatGPT.',
  },
  hero_sub: {
    de: 'Redactly maskiert sensible Daten in Texten und Dateien direkt im Browser. Keine Uploads, keine Logs, keine Server. Die Antwort des LLM kannst du danach lokal entschlüsseln.',
    en: "Redactly masks sensitive data in text and files directly in your browser. No uploads, no logs, no servers. Decrypt the LLM's response locally afterwards.",
  },
  hero_cta_primary: { de: 'Tool öffnen →', en: 'Open the tool →' },
  hero_cta_secondary: { de: 'Wie es funktioniert', en: 'How it works' },
  hero_specs_local: { de: '100 % lokal', en: '100% local' },
  hero_specs_reversible: { de: 'reversibel', en: 'reversible' },
  hero_specs_oss: { de: 'open source', en: 'open source' },
  hero_specs_dach: { de: 'DACH-optimiert', en: 'DACH-optimised' },

  // ---- CTAs ----
  cta_open_tool: { de: 'Tool öffnen', en: 'Open the tool' },
  cta_view_docs: { de: 'Docs lesen', en: 'Read the docs' },
  cta_view_source: { de: 'Source-Code', en: 'Source code' },

  // ---- Footer ----
  footer_tagline: {
    de: 'PII-Maskierung, lokal im Browser. Open Source.',
    en: 'PII masking, local in your browser. Open source.',
  },
  footer_section_product: { de: 'Produkt', en: 'Product' },
  footer_section_resources: { de: 'Ressourcen', en: 'Resources' },
  footer_section_legal: { de: 'Rechtliches', en: 'Legal' },
  footer_link_features: { de: 'Features', en: 'Features' },
  footer_link_docs: { de: 'Dokumentation', en: 'Documentation' },
  footer_link_faq: { de: 'FAQ', en: 'FAQ' },
  footer_link_privacy: { de: 'Datenschutz', en: 'Privacy' },
  footer_link_blog: { de: 'Blog', en: 'Blog' },
  footer_link_github: { de: 'GitHub', en: 'GitHub' },
  footer_link_imprint: { de: 'Impressum', en: 'Imprint' },
  footer_copyright: {
    de: '© {year} Redactly. MIT-Lizenz.',
    en: '© {year} Redactly. MIT licence.',
  },
} as const;

export type MessageKey = keyof typeof messages;
export type Locale = 'de' | 'en';

export const LOCALES = ['de', 'en'] as const satisfies readonly Locale[];
export const DEFAULT_LOCALE: Locale = 'de';
