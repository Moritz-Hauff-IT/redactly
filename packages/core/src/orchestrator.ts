/**
 * LLM-driven file orchestration plan.
 * Takes a manifest of files (from a ZIP or any multi-file source) and asks
 * a WebLLM (or compatible chat engine) to recommend per-file actions:
 * mask | skip | review.
 *
 * Uses small-model strengths: classification + plan generation, NOT entity
 * extraction. The model never sees file CONTENTS in full — only metadata
 * (path, size, mimeType, format, short preview) which keeps the prompt
 * small and the latency manageable.
 *
 * Hallucination safety: every plan entry is validated against the input
 * manifest (the model can't invent paths). Unknown actions default to
 * 'review'.
 */

export type FileAction = 'mask' | 'skip' | 'review';

export interface FilePlanEntry {
  path: string;
  action: FileAction;
  reason: string;
}

export interface FilePlan {
  /** Overall reasoning the model gave for the plan. */
  summary: string;
  entries: FilePlanEntry[];
}

export interface ManifestEntryForLlm {
  path: string;
  size: number;
  mimeType: string;
  format: string | null;
  preview: string;
}

export interface ChatEngine {
  chat: {
    completions: {
      create(params: {
        messages: Array<{ role: string; content: string }>;
        max_tokens?: number;
        temperature?: number;
      }): Promise<{
        choices: Array<{ message: { content: string | null } }>;
      }>;
    };
  };
}

function buildOrchestrationPrompt(manifest: ManifestEntryForLlm[]): string {
  const fileLines = manifest
    .map(
      (e, i) =>
        `${i + 1}. path="${e.path}" size=${e.size}B mime="${e.mimeType}" format="${e.format ?? 'unknown'}" preview="${e.preview.slice(0, 200).replace(/\s+/g, ' ').trim()}"`
    )
    .join('\n');

  return `Du planst die PII-Maskierung für ein hochgeladenes Archiv. Für jede Datei: entscheide ob sie maskiert, übersprungen oder manuell überprüft werden soll.

Regeln:
- "mask": Datei enthält wahrscheinlich PII und kann automatisch maskiert werden (Texte, Emails, PDFs mit Vertragstext, etc.)
- "skip": Datei enthält keine PII oder kann nicht sinnvoll maskiert werden (Bilder, Binaries, Code, Lockfiles, Logos)
- "review": Datei ist unklar oder enthält viel Struktur — User sollte selbst entscheiden (CSVs, JSON-Configs, große Dokumente)

Antworte AUSSCHLIESSLICH mit JSON in diesem Schema:
{"summary":"<ein Satz>","entries":[{"path":"<exact path>","action":"<mask|skip|review>","reason":"<kurze Begründung>"}]}

Jeder "path" MUSS WÖRTLICH einem Pfad aus der Manifest-Liste unten entsprechen.

Manifest (${manifest.length} Dateien):
${fileLines}

JSON:`;
}

function parsePlanResponse(raw: string): FilePlan | null {
  const cleaned = raw.replace(/```(?:json)?\s*/g, '').replace(/```\s*$/g, '');
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const parsed = JSON.parse(m[0]) as unknown;
    if (parsed === null || typeof parsed !== 'object') return null;
    const obj = parsed as Record<string, unknown>;
    const summary = typeof obj['summary'] === 'string' ? obj['summary'] : '';
    const entriesRaw = obj['entries'];
    if (!Array.isArray(entriesRaw)) return null;
    const entries: FilePlanEntry[] = [];
    for (const e of entriesRaw) {
      if (e === null || typeof e !== 'object') continue;
      const eo = e as Record<string, unknown>;
      const path = typeof eo['path'] === 'string' ? eo['path'] : '';
      const actionRaw = typeof eo['action'] === 'string' ? eo['action'].toLowerCase() : '';
      const reason = typeof eo['reason'] === 'string' ? eo['reason'] : '';
      if (!path) continue;
      const action: FileAction =
        actionRaw === 'mask' || actionRaw === 'skip' || actionRaw === 'review'
          ? actionRaw
          : 'review';
      entries.push({ path, action, reason });
    }
    return { summary, entries };
  } catch {
    return null;
  }
}

/** Heuristic fallback plan when no LLM is available. */
export function heuristicPlan(manifest: ManifestEntryForLlm[]): FilePlan {
  const entries: FilePlanEntry[] = manifest.map((e) => {
    if (e.format === 'txt' || e.format === 'md' || e.format === 'eml') {
      return { path: e.path, action: 'mask', reason: 'Text file with likely PII' };
    }
    if (e.format === 'pdf' || e.format === 'docx') {
      return { path: e.path, action: 'mask', reason: 'Document — likely contains PII' };
    }
    if (e.mimeType.startsWith('image/') || e.mimeType.startsWith('video/')) {
      return { path: e.path, action: 'skip', reason: 'Binary media — no text PII' };
    }
    if (e.mimeType === 'application/octet-stream') {
      return { path: e.path, action: 'skip', reason: 'Binary file — cannot mask' };
    }
    return { path: e.path, action: 'review', reason: 'Unknown structure — please decide' };
  });
  return {
    summary: 'Heuristische Standardregeln (kein LLM verwendet).',
    entries,
  };
}

/**
 * Run the LLM orchestration. Returns the plan, or falls back to the
 * heuristic plan on any error. Every returned entry's path is guaranteed
 * to exist in the input manifest (model hallucinations are dropped).
 */
export async function generateFilePlan(
  engine: ChatEngine,
  manifest: ManifestEntryForLlm[],
  options: { timeoutMs?: number; debug?: boolean } = {}
): Promise<FilePlan> {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const debug = options.debug ?? false;

  if (manifest.length === 0) {
    return { summary: 'Leeres Archiv.', entries: [] };
  }

  const prompt = buildOrchestrationPrompt(manifest);
  if (debug) {
    // eslint-disable-next-line no-console
    console.log('[Orchestrator] requesting plan for', manifest.length, 'files');
  }

  let rawContent: string;
  try {
    const createPromise = engine.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'Du bist ein hilfreicher Daten-Klassifikator. Antworte mit gültigem JSON.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: Math.min(1200, manifest.length * 80 + 200),
      temperature: 0.1,
    });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Orchestrator timed out after ${timeoutMs}ms`)), timeoutMs)
    );
    const resp = await Promise.race([createPromise, timeoutPromise]);
    rawContent = resp.choices[0]?.message?.content ?? '';
  } catch (err) {
    if (debug) {
      // eslint-disable-next-line no-console
      console.warn('[Orchestrator] LLM call failed, falling back to heuristic:', err);
    }
    return heuristicPlan(manifest);
  }

  const parsed = parsePlanResponse(rawContent);
  if (parsed === null) {
    if (debug) {
      // eslint-disable-next-line no-console
      console.warn(
        '[Orchestrator] could not parse plan JSON, falling back to heuristic. Raw:',
        rawContent.slice(0, 500)
      );
    }
    return heuristicPlan(manifest);
  }

  // Validate: every entry's path must exist in the input manifest.
  const validPaths = new Set(manifest.map((e) => e.path));
  const validEntries = parsed.entries.filter((e) => validPaths.has(e.path));

  // For files the LLM forgot, fall back to heuristic.
  const decidedPaths = new Set(validEntries.map((e) => e.path));
  const missing = manifest.filter((e) => !decidedPaths.has(e.path));
  const missingEntries = heuristicPlan(missing).entries;

  return {
    summary: parsed.summary,
    entries: [...validEntries, ...missingEntries],
  };
}
