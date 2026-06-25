/**
 * Redactly content script.
 *
 * Injects a small toolbar into ChatGPT / Claude. "Maskieren" detects PII in
 * the prompt editor and replaces it with placeholders in place (keeping a
 * reversible mapping); "Wiederherstellen" walks the page and swaps the
 * placeholders back to the real values in the assistant's reply, so you read
 * the originals while the model only ever saw the masked text.
 *
 * Everything runs locally — regex + the name gazetteer, no model download,
 * nothing leaves the tab. The mapping lives only in this content script's
 * memory for the lifetime of the page.
 *
 * Best-effort by design: ChatGPT and Claude use React-controlled editors whose
 * DOM changes often, so the editor lookup and value injection are heuristic and
 * may need tuning when the sites change.
 */

import { RegexDetector } from '@redactly/core/regex';
import { GazetteerNameDetector } from '@redactly/core/gazetteer';
import { mask } from '@redactly/core/masker';
import { restore } from '@redactly/core/restorer';
import type { Mapping } from '@redactly/core/masker';
import type { Entity } from '@redactly/core/types';

const UI_ATTR = 'data-redactly-ui';
let mapping: Mapping | null = null;

// ── Detection ──────────────────────────────────────────────────────────────

function detect(text: string): Entity[] {
  const candidates = [
    ...new RegexDetector().detect(text),
    ...new GazetteerNameDetector().detect(text),
  ];
  // Simple non-overlap dedup (earliest start, longest span wins).
  candidates.sort((a, b) => a.start - b.start || b.end - a.end);
  const taken: Array<[number, number]> = [];
  const out: Entity[] = [];
  for (const e of candidates) {
    if (taken.some(([a, b]) => e.start < b && a < e.end)) continue;
    out.push(e);
    taken.push([e.start, e.end]);
  }
  return out;
}

// ── Editor access ──────────────────────────────────────────────────────────

function isEditable(el: Element | null): el is HTMLElement {
  if (!el) return false;
  if (el instanceof HTMLTextAreaElement) return true;
  return el instanceof HTMLElement && el.isContentEditable;
}

/** Find the prompt editor: prefer the focused field, else a known composer. */
function findEditor(): HTMLElement | null {
  const active = document.activeElement;
  if (isEditable(active)) return active;
  const candidates = document.querySelectorAll<HTMLElement>(
    'textarea#prompt-textarea, div.ProseMirror[contenteditable="true"], textarea, [contenteditable="true"]'
  );
  // Last one tends to be the live composer.
  for (let i = candidates.length - 1; i >= 0; i--) {
    const el = candidates[i];
    if (el && isEditable(el) && el.offsetParent !== null) return el;
  }
  return null;
}

function readEditor(el: HTMLElement): string {
  return el instanceof HTMLTextAreaElement ? el.value : (el.innerText ?? '');
}

/** Write text back so the site's framework (React/ProseMirror) registers it. */
function writeEditor(el: HTMLElement, text: string): void {
  if (el instanceof HTMLTextAreaElement) {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    setter?.call(el, text);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }
  // contenteditable (Claude / new ChatGPT composer)
  el.focus();
  const sel = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(el);
  sel?.removeAllRanges();
  sel?.addRange(range);
  // Replace the whole selection; falls back to textContent if execCommand is gone.
  if (!document.execCommand('insertText', false, text)) {
    el.textContent = text;
    el.dispatchEvent(new InputEvent('input', { bubbles: true }));
  }
}

// ── Actions ────────────────────────────────────────────────────────────────

function maskPrompt(status: (msg: string) => void): void {
  const el = findEditor();
  if (!el) {
    status('Kein Eingabefeld gefunden');
    return;
  }
  const text = readEditor(el);
  if (!text.trim()) {
    status('Eingabefeld ist leer');
    return;
  }
  const entities = detect(text);
  const result = mask(text, entities, mapping ? { existing: mapping } : undefined);
  mapping = result.mapping;
  writeEditor(el, result.maskedText);
  status(`${entities.length} maskiert`);
}

function restorePage(status: (msg: string) => void): void {
  if (!mapping || mapping.forward.size === 0) {
    status('Noch nichts maskiert');
    return;
  }
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const changes: Array<[Text, string]> = [];
  let node: Node | null = walker.nextNode();
  while (node) {
    const text = node as Text;
    const parent = text.parentElement;
    const value = text.nodeValue ?? '';
    if (parent && !parent.closest(`[${UI_ATTR}]`) && value.includes('[')) {
      const restored = restore(value, mapping, { tolerant: true }).restoredText;
      if (restored !== value) changes.push([text, restored]);
    }
    node = walker.nextNode();
  }
  for (const [text, restored] of changes) text.nodeValue = restored;
  status(changes.length > 0 ? `${changes.length} wiederhergestellt` : 'Keine Platzhalter gefunden');
}

// ── UI ───────────────────────────────────────────────────────────────────────

function button(label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.textContent = label;
  b.style.cssText =
    'all:unset;cursor:pointer;font:600 12px system-ui,sans-serif;padding:7px 11px;border-radius:8px;background:#f2960c;color:#0f172a;white-space:nowrap;';
  b.addEventListener('mouseenter', () => (b.style.filter = 'brightness(1.08)'));
  b.addEventListener('mouseleave', () => (b.style.filter = 'none'));
  b.addEventListener('click', onClick);
  return b;
}

function mountToolbar(): void {
  if (document.querySelector(`[${UI_ATTR}]`)) return;
  const bar = document.createElement('div');
  bar.setAttribute(UI_ATTR, 'bar');
  bar.style.cssText =
    'position:fixed;right:16px;bottom:16px;z-index:2147483647;display:flex;align-items:center;gap:8px;' +
    'padding:8px 10px;border-radius:12px;background:#0f172a;border:1px solid rgba(255,255,255,.12);' +
    'box-shadow:0 10px 30px rgba(0,0,0,.45);font-family:system-ui,sans-serif;';

  const status = document.createElement('span');
  status.style.cssText =
    'font:11px ui-monospace,monospace;color:#94a3b8;min-width:62px;text-align:right;';
  status.textContent = '🔒 lokal';
  const setStatus = (msg: string) => {
    status.textContent = msg;
    window.setTimeout(() => (status.textContent = '🔒 lokal'), 2600);
  };

  bar.appendChild(button('🛡 Maskieren', () => maskPrompt(setStatus)));
  bar.appendChild(button('↩︎ Wiederherstellen', () => restorePage(setStatus)));
  bar.appendChild(status);
  document.body.appendChild(bar);
}

// The composer mounts late and SPA navigations can drop our bar — re-mount.
mountToolbar();
const reattach = new MutationObserver(() => {
  if (!document.querySelector(`[${UI_ATTR}]`)) mountToolbar();
});
reattach.observe(document.documentElement, { childList: true, subtree: true });
