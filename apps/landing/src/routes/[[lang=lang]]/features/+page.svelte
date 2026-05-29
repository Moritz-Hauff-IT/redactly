<script lang="ts">
  import SeoHead from '$lib/components/SeoHead.svelte';
  import { loc, currentLocale } from '$lib/i18n/locale.svelte.js';

  interface BL {
    de: string;
    en: string;
  }
  interface Category {
    icon: string;
    name: BL;
    description: BL;
    examples: string[];
  }

  const categories: Category[] = [
    {
      icon: '👤',
      name: { de: 'Personendaten', en: 'Person data' },
      description: {
        de: 'Namen, Adressen, Geburtsdaten und andere persönliche Identifikatoren.',
        en: 'Names, addresses, birth dates and other personal identifiers.',
      },
      examples: ['Max Mustermann', 'Hauptstr. 1', '01.01.1990'],
    },
    {
      icon: '📧',
      name: { de: 'Kontaktdaten', en: 'Contact data' },
      description: {
        de: 'E-Mail-Adressen, Telefonnummern, URLs.',
        en: 'Email addresses, phone numbers, URLs.',
      },
      examples: ['user@example.com', '+49 170 1234567', 'https://...'],
    },
    {
      icon: '🔑',
      name: { de: 'Zugangsdaten', en: 'Credentials' },
      description: {
        de: 'API-Keys, Passwörter, Tokens und Secrets.',
        en: 'API keys, passwords, tokens and secrets.',
      },
      examples: ['sk-...', 'Bearer eyJ...', 'password=...'],
    },
    {
      icon: '💳',
      name: { de: 'Finanzdaten', en: 'Financial data' },
      description: {
        de: 'IBAN, Kreditkartennummern, Kontonummern.',
        en: 'IBANs, credit-card numbers, account numbers.',
      },
      examples: ['DE12 3456 7890', '4111 1111 1111'],
    },
    {
      icon: '🏥',
      name: { de: 'Medizinische Daten', en: 'Medical data' },
      description: {
        de: 'Diagnosen, Medikamente, Patientennummern.',
        en: 'Diagnoses, medications, patient IDs.',
      },
      examples: ['ICD-10: J20.9', 'Pat-Nr 12345'],
    },
    {
      icon: '🌍',
      name: { de: 'Standort & IDs', en: 'Location & IDs' },
      description: {
        de: 'IP-Adressen, Standorte, Personalausweis- und Steuernummern.',
        en: 'IP addresses, locations, ID-card and tax numbers.',
      },
      examples: ['192.168.1.1', '52.5200° N', 'DE123456789'],
    },
  ];

  interface FileFormat {
    icon: string;
    ext: string;
    label: BL;
  }
  const fileFormats: FileFormat[] = [
    { icon: '📝', ext: '.txt', label: { de: 'Plaintext', en: 'Plain text' } },
    { icon: '📋', ext: '.md', label: { de: 'Markdown', en: 'Markdown' } },
    { icon: '📨', ext: '.eml', label: { de: 'E-Mail', en: 'Email' } },
    { icon: '📄', ext: '.pdf', label: { de: 'PDF', en: 'PDF' } },
    { icon: '📃', ext: '.docx', label: { de: 'Word', en: 'Word' } },
    { icon: '📊', ext: '.xlsx', label: { de: 'Excel', en: 'Excel' } },
    { icon: '🖼️', ext: '.pptx', label: { de: 'PowerPoint', en: 'PowerPoint' } },
    { icon: '🗜️', ext: '.zip', label: { de: 'Archive', en: 'Archive' } },
    { icon: '📷', ext: '.png/jpg', label: { de: 'Bilder (OCR)', en: 'Images (OCR)' } },
    { icon: '🧾', ext: '.csv/json/yaml', label: { de: 'Daten/Code', en: 'Data/code' } },
  ];

  interface Mode {
    name: string;
    badge: BL;
    highlight: boolean;
    description: BL;
    pros: BL[];
    cons: BL[];
  }

  const modes: Mode[] = [
    {
      name: 'Regex',
      badge: { de: 'Offline', en: 'Offline' },
      highlight: false,
      description: {
        de: 'Pattern-basierte Erkennung via reguläre Ausdrücke. Kein Modell-Download, kein Netzwerk. Funktioniert vollständig offline.',
        en: 'Pattern-based detection with regular expressions. No model download, no network. Works fully offline.',
      },
      pros: [
        { de: 'Sofort verfügbar', en: 'Instantly available' },
        { de: 'Kein Download', en: 'No download' },
        { de: 'Deterministisch', en: 'Deterministic' },
        { de: 'Schnell', en: 'Fast' },
      ],
      cons: [
        { de: 'Kontextblind', en: 'Context-blind' },
        { de: 'Kann unbekannte Patterns verpassen', en: 'Can miss unknown patterns' },
      ],
    },
    {
      name: 'NER',
      badge: { de: 'Empfohlen', en: 'Recommended' },
      highlight: true,
      description: {
        de: 'Named Entity Recognition mit transformers.js lokal im Browser. Einmaliger Modell-Download (~80 MB), danach gecacht.',
        en: 'Named Entity Recognition with transformers.js, running locally in your browser. One-time model download (~80 MB), then cached.',
      },
      pros: [
        { de: 'Kontextbewusst', en: 'Context-aware' },
        { de: 'Höhere Recall', en: 'Higher recall' },
        { de: 'Mehrsprachig', en: 'Multilingual' },
        { de: 'Lokal gecacht', en: 'Cached locally' },
      ],
      cons: [
        { de: 'Einmaliger Download ~80 MB', en: 'One-time download ~80 MB' },
        { de: 'Erste Initialisierung dauert länger', en: 'First init takes a moment' },
      ],
    },
    {
      name: 'WebLLM',
      badge: { de: 'Max Genauigkeit', en: 'Max accuracy' },
      highlight: false,
      description: {
        de: 'Kleines LLM läuft vollständig im Browser per WebGPU/WASM. Beste Kontexterkennung, größter Modell-Download.',
        en: 'A small LLM runs entirely in the browser via WebGPU/WASM. Best context understanding, largest model download.',
      },
      pros: [
        { de: 'Höchste Genauigkeit', en: 'Highest accuracy' },
        { de: 'Versteht Kontext und Semantik', en: 'Understands context and semantics' },
        { de: 'Vollständig lokal', en: 'Fully local' },
      ],
      cons: [
        { de: 'Download 1–4 GB', en: 'Download 1–4 GB' },
        { de: 'Benötigt GPU/leistungsstarke Hardware', en: 'Needs GPU / capable hardware' },
      ],
    },
  ];

  const lang = $derived(currentLocale());
  const pageMeta = $derived(
    lang === 'en'
      ? {
          title: 'Features',
          desc: 'All Redactly features: detection categories, file formats, masking modes and reversibility.',
        }
      : {
          title: 'Features',
          desc: 'Alle Features von Redactly: Erkennungskategorien, Dateiformate, Masking-Modi und Reversibilität.',
        }
  );

  const h1 = $derived(loc({ de: 'Features', en: 'Features' }));
  const lead = $derived(
    loc({
      de: 'Was Redactly erkennt, was es verarbeitet und wie die Erkennungsmodi sich unterscheiden.',
      en: 'What Redactly detects, what it processes, and how the detection modes differ.',
    })
  );
  const catHeading = $derived(loc({ de: 'Erkennungskategorien', en: 'Detection categories' }));
  const fmtHeading = $derived(
    loc({ de: 'Unterstützte Dateiformate', en: 'Supported file formats' })
  );
  const modeHeading = $derived(loc({ de: 'Erkennungsmodi', en: 'Detection modes' }));
  const modeIntro = $derived(
    loc({
      de: 'Du wählst, wieviel Rechenleistung und Netzwerk du bereitstellen möchtest.',
      en: 'You choose how much compute and network you want to spend.',
    })
  );
  const revHeading = $derived(loc({ de: 'Reversibles Masking', en: 'Reversible masking' }));
  const revBody = $derived(
    loc({
      de: 'Redactly ersetzt PII durch nummerierte Platzhalter und hält das Mapping lokal. Nach dem LLM-Aufruf werden Platzhalter durch Originalwerte ersetzt — verlässt nie deinen Browser.',
      en: 'Redactly replaces PII with numbered placeholders and keeps the mapping locally. After the LLM call the placeholders are restored to the original values — none of it ever leaves your browser.',
    })
  );
  const revOriginal = $derived(loc({ de: 'Original', en: 'Original' }));
  const revMaskingLabel = $derived(loc({ de: 'Masking', en: 'Masking' }));
  const revMasked = $derived(loc({ de: 'Maskiert', en: 'Masked' }));
  const revSampleOriginal = $derived(
    loc({
      de: 'Max Mustermann hat die E-Mail max@beispiel.de und wohnt in Berlin.',
      en: 'Max Mustermann has the email max@example.com and lives in Berlin.',
    })
  );
  const revSampleMasked = $derived(
    loc({
      de: '[NAME_1] hat die E-Mail [EMAIL_1] und wohnt in [LOCATION_1].',
      en: '[NAME_1] has the email [EMAIL_1] and lives in [LOCATION_1].',
    })
  );
</script>

<SeoHead title={pageMeta.title} description={pageMeta.desc} path="/features" />

<div class="bg-white py-16 sm:py-20">
  <div class="mx-auto max-w-5xl px-4 sm:px-6">
    <div class="mb-12 text-center">
      <h1 class="text-4xl font-extrabold tracking-tight text-slate-900">{h1}</h1>
      <p class="mx-auto mt-4 max-w-2xl text-xl text-slate-600">{lead}</p>
    </div>

    <!-- Detection categories -->
    <section class="mb-16">
      <h2 class="mb-6 text-2xl font-bold text-slate-900">{catHeading}</h2>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each categories as cat}
          <div class="rounded-xl border border-slate-200 bg-white p-5">
            <div class="mb-3 flex items-center gap-2">
              <span class="text-xl">{cat.icon}</span>
              <h3 class="font-semibold text-slate-900">{loc(cat.name)}</h3>
            </div>
            <p class="mb-3 text-sm text-slate-600">{loc(cat.description)}</p>
            <div class="flex flex-wrap gap-1.5">
              {#each cat.examples as ex}
                <code class="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">{ex}</code>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </section>

    <!-- File formats -->
    <section class="mb-16">
      <h2 class="mb-6 text-2xl font-bold text-slate-900">{fmtHeading}</h2>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {#each fileFormats as fmt}
          <div
            class="flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50 p-4 text-center"
          >
            <span class="mb-2 text-3xl">{fmt.icon}</span>
            <code class="mb-1 font-mono text-sm font-bold text-teal-700">{fmt.ext}</code>
            <span class="text-xs text-slate-500">{loc(fmt.label)}</span>
          </div>
        {/each}
      </div>
    </section>

    <!-- Detection modes -->
    <section class="mb-16">
      <h2 class="mb-2 text-2xl font-bold text-slate-900">{modeHeading}</h2>
      <p class="mb-6 text-slate-600">{modeIntro}</p>
      <div class="grid gap-6 lg:grid-cols-3">
        {#each modes as mode}
          <div
            class="flex flex-col rounded-2xl border p-6 {mode.highlight
              ? 'border-teal-300 bg-teal-50'
              : 'border-slate-200 bg-white'}"
          >
            <div class="mb-1 flex items-center justify-between">
              <h3 class="text-lg font-bold text-slate-900">{mode.name}</h3>
              {#if mode.badge}
                <span class="rounded-full bg-teal-600 px-2.5 py-0.5 text-xs font-medium text-white">
                  {loc(mode.badge)}
                </span>
              {/if}
            </div>
            <p class="mb-4 text-sm text-slate-600">{loc(mode.description)}</p>
            <ul class="mt-auto space-y-2 text-sm">
              {#each mode.pros as pro}
                <li class="flex items-start gap-2 text-slate-700">
                  <svg
                    class="mt-0.5 h-4 w-4 flex-shrink-0 text-teal-500"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  {loc(pro)}
                </li>
              {/each}
              {#each mode.cons as con}
                <li class="flex items-start gap-2 text-slate-500">
                  <svg
                    class="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
                    />
                  </svg>
                  {loc(con)}
                </li>
              {/each}
            </ul>
          </div>
        {/each}
      </div>
    </section>

    <!-- Reversible masking -->
    <section class="rounded-2xl border border-teal-200 bg-teal-50 p-8">
      <h2 class="mb-4 text-2xl font-bold text-teal-900">{revHeading}</h2>
      <p class="mb-6 text-teal-800">{revBody}</p>
      <div class="grid gap-4 text-sm sm:grid-cols-3">
        <div class="rounded-xl bg-white p-4">
          <div class="mb-2 font-semibold text-slate-900">{revOriginal}</div>
          <p class="font-mono text-xs text-slate-600">{revSampleOriginal}</p>
        </div>
        <div class="flex items-center justify-center">
          <div class="text-center">
            <div class="text-2xl text-teal-600">→</div>
            <div class="mt-1 text-xs font-medium text-teal-700">{revMaskingLabel}</div>
          </div>
        </div>
        <div class="rounded-xl bg-white p-4">
          <div class="mb-2 font-semibold text-slate-900">{revMasked}</div>
          <p class="font-mono text-xs text-slate-600">{revSampleMasked}</p>
        </div>
      </div>
    </section>
  </div>
</div>
