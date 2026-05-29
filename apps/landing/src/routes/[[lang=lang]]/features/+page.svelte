<script lang="ts">
  import SeoHead from '$lib/components/SeoHead.svelte';

  const categories = [
    {
      icon: '👤',
      name: 'Personendaten',
      description: 'Namen, Adressen, Geburtsdaten und andere persönliche Identifikatoren.',
      examples: ['Max Mustermann', 'Hauptstr. 1', '01.01.1990'],
    },
    {
      icon: '📧',
      name: 'Kontaktdaten',
      description: 'E-Mail-Adressen, Telefonnummern, URLs.',
      examples: ['user@example.com', '+49 170 1234567', 'https://...'],
    },
    {
      icon: '🔑',
      name: 'Zugangsdaten',
      description: 'API-Keys, Passwörter, Tokens und Secrets.',
      examples: ['sk-...', 'Bearer eyJ...', 'password=...'],
    },
    {
      icon: '💳',
      name: 'Finanzdaten',
      description: 'IBAN, Kreditkartennummern, Kontonummern.',
      examples: ['DE12 3456 7890', '4111 1111 1111'],
    },
    {
      icon: '🏥',
      name: 'Medizinische Daten',
      description: 'Diagnosen, Medikamente, Patientennummern.',
      examples: ['ICD-10: J20.9', 'Pat-Nr 12345'],
    },
    {
      icon: '🌍',
      name: 'Standort & IDs',
      description: 'IP-Adressen, Standorte, Personalausweis- und Steuernummern.',
      examples: ['192.168.1.1', '52.5200° N', 'DE123456789'],
    },
  ];

  const fileFormats = [
    { icon: '📝', ext: '.txt', label: 'Plaintext' },
    { icon: '📋', ext: '.md', label: 'Markdown' },
    { icon: '📨', ext: '.eml', label: 'E-Mail' },
    { icon: '📄', ext: '.pdf', label: 'PDF' },
    { icon: '📃', ext: '.docx', label: 'Word' },
  ];

  const modes = [
    {
      name: 'Regex',
      badge: 'Offline',
      highlight: false,
      description:
        'Pattern-basierte Erkennung via reguläre Ausdrücke. Kein Modell-Download, kein Netzwerk. Funktioniert vollständig offline.',
      pros: ['Sofort verfügbar', 'Kein Download', 'Deterministisch', 'Schnell'],
      cons: ['Kontextblind', 'Kann unbekannte Patterns verpassen'],
    },
    {
      name: 'NER',
      badge: 'Empfohlen',
      highlight: true,
      description:
        'Named Entity Recognition mit transformers.js lokal im Browser. Einmaliger Modell-Download (~80 MB), danach gecacht.',
      pros: ['Kontextbewusst', 'Höhere Recall', 'Mehrsprachig', 'Lokal gecacht'],
      cons: ['Einmaliger Download ~80 MB', 'Erste Initialisierung dauert länger'],
    },
    {
      name: 'WebLLM',
      badge: 'Max Genauigkeit',
      highlight: false,
      description:
        'Kleines LLM läuft vollständig im Browser per WebGPU/WASM. Beste Kontexterkennung, größter Modell-Download.',
      pros: ['Höchste Genauigkeit', 'Versteht Kontext und Semantik', 'Vollständig lokal'],
      cons: ['Download 1–4 GB', 'Benötigt GPU/leistungsstarke Hardware'],
    },
  ];
</script>

<SeoHead
  title="Features"
  description="Alle Features von Redactly: Erkennungskategorien, Dateiformate, Masking-Modi und Reversibilität."
  path="/features"
/>

<div class="bg-white py-16 sm:py-20">
  <div class="mx-auto max-w-5xl px-4 sm:px-6">
    <div class="mb-12 text-center">
      <h1 class="text-4xl font-extrabold tracking-tight text-slate-900">Features</h1>
      <p class="mx-auto mt-4 max-w-2xl text-xl text-slate-600">
        Was Redactly erkennt, was es verarbeitet und wie die Erkennungsmodi sich unterscheiden.
      </p>
    </div>

    <!-- Detection categories -->
    <section class="mb-16">
      <h2 class="mb-6 text-2xl font-bold text-slate-900">Erkennungskategorien</h2>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each categories as cat}
          <div class="rounded-xl border border-slate-200 bg-white p-5">
            <div class="mb-3 flex items-center gap-2">
              <span class="text-xl">{cat.icon}</span>
              <h3 class="font-semibold text-slate-900">{cat.name}</h3>
            </div>
            <p class="mb-3 text-sm text-slate-600">{cat.description}</p>
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
      <h2 class="mb-6 text-2xl font-bold text-slate-900">Unterstützte Dateiformate</h2>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {#each fileFormats as fmt}
          <div
            class="flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50 p-4 text-center"
          >
            <span class="mb-2 text-3xl">{fmt.icon}</span>
            <code class="mb-1 font-mono text-sm font-bold text-teal-700">{fmt.ext}</code>
            <span class="text-xs text-slate-500">{fmt.label}</span>
          </div>
        {/each}
      </div>
    </section>

    <!-- Detection modes -->
    <section class="mb-16">
      <h2 class="mb-2 text-2xl font-bold text-slate-900">Erkennungsmodi</h2>
      <p class="mb-6 text-slate-600">
        Du wählst, wieviel Rechenleistung und Netzwerk du bereitstellen möchtest.
      </p>
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
                  {mode.badge}
                </span>
              {/if}
            </div>
            <p class="mb-4 text-sm text-slate-600">{mode.description}</p>
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
                  {pro}
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
                  {con}
                </li>
              {/each}
            </ul>
          </div>
        {/each}
      </div>
    </section>

    <!-- Reversible masking -->
    <section class="rounded-2xl border border-teal-200 bg-teal-50 p-8">
      <h2 class="mb-4 text-2xl font-bold text-teal-900">Reversibles Masking</h2>
      <p class="mb-6 text-teal-800">
        Redactly ersetzt PII durch nummerierte Platzhalter und hält das Mapping lokal. Nach dem
        LLM-Aufruf werden Platzhalter durch Originalwerte ersetzt — verlässt nie deinen Browser.
      </p>
      <div class="grid gap-4 sm:grid-cols-3 text-sm">
        <div class="rounded-xl bg-white p-4">
          <div class="mb-2 font-semibold text-slate-900">Original</div>
          <p class="font-mono text-slate-600 text-xs">
            Max Mustermann hat die E-Mail max@beispiel.de und wohnt in Berlin.
          </p>
        </div>
        <div class="flex items-center justify-center">
          <div class="text-center">
            <div class="text-2xl text-teal-600">→</div>
            <div class="mt-1 text-xs text-teal-700 font-medium">Masking</div>
          </div>
        </div>
        <div class="rounded-xl bg-white p-4">
          <div class="mb-2 font-semibold text-slate-900">Maskiert</div>
          <p class="font-mono text-slate-600 text-xs">
            [NAME_1] hat die E-Mail [EMAIL_1] und wohnt in [LOCATION_1].
          </p>
        </div>
      </div>
    </section>
  </div>
</div>
