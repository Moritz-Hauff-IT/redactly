<script lang="ts">
  import SeoHead from '$lib/components/SeoHead.svelte';

  const guarantees = [
    {
      icon: '🚫',
      title: 'Keine Server-Verarbeitung',
      description:
        'Der einzige Server, der existiert, liefert statische Dateien (HTML, CSS, JS). Nutzerinhalte werden dort niemals empfangen, verarbeitet oder gespeichert.',
    },
    {
      icon: '📊',
      title: 'Keine Analytics, kein Tracking',
      description:
        'Keine Google Analytics, kein Mixpanel, kein Segment, kein Pixel. Die Standardinstallation enthält überhaupt kein Tracking-Script.',
    },
    {
      icon: '🔓',
      title: 'Open Source — Code prüfbar',
      description:
        'Der gesamte Quellcode ist auf GitHub verfügbar. Du kannst jede Zeile lesen, forken oder selbst hosten. Vertrauen durch Transparenz, nicht durch Marketing.',
    },
    {
      icon: '💾',
      title: 'Modelle werden lokal gecacht',
      description:
        'NER- und LLM-Modelle werden beim ersten Start einmalig vom CDN geladen und dann im Browser gecacht (Cache API / IndexedDB). Kein erneuter Download bei jedem Besuch.',
    },
    {
      icon: '🗑️',
      title: 'Session-scoped Mapping',
      description:
        'Das PII-Mapping (Original → Placeholder) ist session-scoped und lebt nur im Arbeitsspeicher des Tabs. Beim Schließen wird es verworfen — kein Persistieren, kein Cookie.',
    },
  ];
</script>

<SeoHead
  title="Privacy"
  description="Redactly verarbeitet keine Nutzerdaten auf Servern. Alles läuft lokal im Browser. So kannst du es selbst prüfen."
  path="/privacy"
/>

<div class="bg-white py-16 sm:py-20">
  <div class="mx-auto max-w-3xl px-4 sm:px-6">
    <div class="mb-12">
      <h1 class="text-4xl font-extrabold tracking-tight text-slate-900">Privacy-Versprechen</h1>
      <p class="mt-4 text-xl text-slate-600">
        Redactly verarbeitet <em>keine</em> Nutzerinhalte auf externen Servern. Das ist keine Marketingaussage
        — es ist technisch unmöglich, weil es keinen Server gibt.
      </p>
    </div>

    <!-- Guarantees -->
    <section class="mb-12">
      <h2 class="mb-6 text-2xl font-bold text-slate-900">Explizite Garantien</h2>
      <div class="space-y-4">
        {#each guarantees as g}
          <div class="flex gap-4 rounded-xl border border-slate-200 p-5">
            <div class="flex-shrink-0 text-2xl">{g.icon}</div>
            <div>
              <h3 class="font-semibold text-slate-900">{g.title}</h3>
              <p class="mt-1 text-sm leading-relaxed text-slate-600">{g.description}</p>
            </div>
          </div>
        {/each}
      </div>
    </section>

    <!-- HuggingFace transparency -->
    <section class="mb-12 rounded-2xl border border-amber-200 bg-amber-50 p-6">
      <h2 class="mb-3 flex items-center gap-2 text-xl font-bold text-amber-900">
        <span>⚠️</span>
        Transparenz: Modell-Download vom CDN
      </h2>
      <div class="prose prose-sm max-w-none text-amber-800">
        <p>
          Wenn du den <strong>NER-Erkennungsmodus</strong> oder <strong>WebLLM</strong> aktivierst, werden
          Modelle beim ersten Start einmalig von einem öffentlichen CDN geladen:
        </p>
        <ul class="mt-3 space-y-1.5 text-sm">
          <li>
            <strong>NER-Modelle</strong> werden von <code>huggingface.co</code> heruntergeladen (transformers.js).
          </li>
          <li>
            <strong>WebLLM-Modelle</strong> werden von einem konfigurierten CDN geladen.
          </li>
        </ul>
        <p class="mt-3">
          <strong>Was dabei <em>nicht</em> übertragen wird:</strong> dein Text, deine Eingaben, deine
          Mappings — nichts davon. Der Download ist das Modell selbst, nicht deine Daten. Danach werden
          Modelle lokal im Browser gecacht (IndexedDB/Cache API), sodass kein erneuter Download beim nächsten
          Besuch nötig ist.
        </p>
        <p class="mt-3">
          Wenn du auch diesen CDN-Request vermeiden willst, nutze nur den
          <strong>Regex-Modus</strong> — dieser kommt ohne externe Netzwerkanfragen aus.
        </p>
      </div>
    </section>

    <!-- Verify yourself -->
    <section class="mb-12">
      <h2 class="mb-4 text-2xl font-bold text-slate-900">Selbst prüfen</h2>
      <p class="mb-6 text-slate-600">
        Vertraue nicht blindlings — öffne die DevTools und überzeuge dich selbst:
      </p>
      <div class="space-y-4">
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 class="font-semibold text-slate-900">Schritt 1: DevTools öffnen</h3>
          <p class="mt-1 text-sm text-slate-600">
            Drücke <kbd
              class="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs font-mono"
              >F12</kbd
            >
            oder
            <kbd class="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs font-mono"
              >Cmd+Option+I</kbd
            >
            um die Browser-Entwicklertools zu öffnen.
          </p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 class="font-semibold text-slate-900">Schritt 2: Network-Tab auswählen</h3>
          <p class="mt-1 text-sm text-slate-600">
            Wechsle zum Tab "Network" (oder "Netzwerk"). Aktiviere "Preserve log" und starte die
            App.
          </p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 class="font-semibold text-slate-900">Schritt 3: Filter auf POST/PUT/PATCH</h3>
          <p class="mt-1 text-sm text-slate-600">
            Filtere nach Methode: <code class="rounded bg-slate-200 px-1 text-xs">POST</code>,
            <code class="rounded bg-slate-200 px-1 text-xs">PUT</code>,
            <code class="rounded bg-slate-200 px-1 text-xs">PATCH</code>. Gib dann Text in die App
            ein und beobachte: <strong>keine Requests mit deinem Inhalt</strong>.
          </p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 class="font-semibold text-slate-900">Schritt 4: Requests auf Inhalt prüfen</h3>
          <p class="mt-1 text-sm text-slate-600">
            Alle Requests, die du siehst, sind entweder statische Assets (HTML/CSS/JS) oder — beim
            NER/WebLLM-Modus — Modell-Downloads. Keiner enthält deinen Text.
          </p>
        </div>
      </div>
    </section>

    <!-- DSGVO note -->
    <section class="rounded-2xl border border-teal-200 bg-teal-50 p-6">
      <h2 class="mb-3 text-xl font-bold text-teal-900">DSGVO-Konformität</h2>
      <p class="text-sm leading-relaxed text-teal-800">
        Da Redactly keine personenbezogenen Daten auf Servern verarbeitet oder speichert, entfallen
        die meisten DSGVO-Anforderungen an den Betreiber (Art. 5–11 DSGVO). Einzig der CDN-Abruf der
        Modelle stellt technisch einen Drittland-Transfer dar — dies betrifft jedoch nur
        Modellgewichte, nicht Nutzerdaten. Für den Einsatz in Unternehmensumgebungen empfehlen wir
        den Regex-Only-Modus oder eine Self-Hosted-Installation mit lokalem Modell-Cache.
      </p>
    </section>
  </div>
</div>
