<script lang="ts">
  interface Feature {
    icon: string;
    title: string;
    description: string;
  }

  const features: Feature[] = [
    {
      icon: '🛡️',
      title: 'Privacy first',
      description:
        'Nichts verlässt deinen Browser. Alle Erkennung und Maskierung läuft lokal — dein Text wird niemals an einen Server gesendet.',
    },
    {
      icon: '↔️',
      title: 'Reversibel',
      description:
        'Maskierte Antworten vom LLM werden lokal zurückübersetzt. Füge die Antwort ein und erhalte den originalen Text mit deinen echten Daten zurück.',
    },
    {
      icon: '🧠',
      title: 'Hybrid Detection',
      description:
        'Drei Erkennungsstufen: schnelle Regex-Patterns, lokales NER-Modell (transformers.js) und optionales WebLLM für maximale Genauigkeit.',
    },
    {
      icon: '📄',
      title: 'Datei-Support',
      description:
        'Verarbeite .txt, .md, .eml, .pdf und .docx direkt im Browser. Kein Upload nötig — die Dateien werden lokal geparst.',
    },
    {
      icon: '🔓',
      title: 'Open Source',
      description:
        'Vollständig quelloffen auf GitHub. Prüfe den Code selbst — kein Vertrauen nötig, nur Verifikation.',
    },
    {
      icon: '🌐',
      title: 'Mehrsprachig',
      description:
        'Erkennung für Deutsch und Englisch out-of-the-box. Mit NER-Modus erweiterbar auf weitere Sprachen.',
    },
  ];
</script>

<section class="bg-slate-50 py-20">
  <div class="mx-auto max-w-6xl px-4 sm:px-6">
    <div class="text-center">
      <h2 class="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Warum de-pii?</h2>
      <p class="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
        Produktivität mit KI ohne Datenschutzrisiken. de-pii macht deine LLM-Nutzung sicher — ohne
        Workflow-Unterbrechung.
      </p>
    </div>

    <div class="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {#each features as feature}
        <div
          class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <div class="mb-4 text-3xl" role="img" aria-label={feature.title}>
            {feature.icon}
          </div>
          <h3 class="mb-2 text-lg font-semibold text-slate-900">{feature.title}</h3>
          <p class="text-sm leading-relaxed text-slate-600">{feature.description}</p>
        </div>
      {/each}
    </div>
  </div>
</section>
