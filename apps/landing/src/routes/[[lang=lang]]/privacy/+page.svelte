<script lang="ts">
  import SeoHead from '$lib/components/SeoHead.svelte';
  import { loc, currentLocale } from '$lib/i18n/locale.svelte.js';

  interface BL {
    de: string;
    en: string;
  }
  interface Guarantee {
    icon: string;
    title: BL;
    description: BL;
  }

  const guarantees: Guarantee[] = [
    {
      icon: '🚫',
      title: { de: 'Keine Server-Verarbeitung', en: 'No server-side processing' },
      description: {
        de: 'Der einzige Server, der existiert, liefert statische Dateien (HTML, CSS, JS). Nutzerinhalte werden dort niemals empfangen, verarbeitet oder gespeichert.',
        en: 'The only server that exists serves static files (HTML, CSS, JS). User content is never received, processed, or stored there.',
      },
    },
    {
      icon: '📊',
      title: { de: 'Keine Analytics, kein Tracking', en: 'No analytics, no tracking' },
      description: {
        de: 'Keine Google Analytics, kein Mixpanel, kein Segment, kein Pixel. Die Standardinstallation enthält überhaupt kein Tracking-Script.',
        en: 'No Google Analytics, no Mixpanel, no Segment, no pixel. The default install contains no tracking script at all.',
      },
    },
    {
      icon: '🔓',
      title: { de: 'Open Source — Code prüfbar', en: 'Open source — auditable code' },
      description: {
        de: 'Der gesamte Quellcode ist auf GitHub verfügbar. Du kannst jede Zeile lesen, forken oder selbst hosten. Vertrauen durch Transparenz, nicht durch Marketing.',
        en: 'The entire source is on GitHub. Read every line, fork it, self-host it. Trust through transparency, not through marketing.',
      },
    },
    {
      icon: '💾',
      title: { de: 'Modelle werden lokal gecacht', en: 'Models are cached locally' },
      description: {
        de: 'NER- und LLM-Modelle werden beim ersten Start einmalig vom CDN geladen und dann im Browser gecacht (Cache API / IndexedDB). Kein erneuter Download bei jedem Besuch.',
        en: 'NER and LLM models are downloaded once on first use from the CDN, then cached in the browser (Cache API / IndexedDB). No re-download on subsequent visits.',
      },
    },
    {
      icon: '🗑️',
      title: { de: 'Session-scoped Mapping', en: 'Session-scoped mapping' },
      description: {
        de: 'Das PII-Mapping (Original → Placeholder) ist session-scoped und lebt nur im Arbeitsspeicher des Tabs. Beim Schließen wird es verworfen — kein Persistieren, kein Cookie.',
        en: "The PII mapping (original → placeholder) is session-scoped and lives only in the tab's memory. Closing the tab discards it — no persistence, no cookie.",
      },
    },
  ];

  const lang = $derived(currentLocale());
  const pageMeta = $derived(
    lang === 'en'
      ? {
          title: 'Privacy',
          desc: 'Redactly does not process user data on a server. Everything runs locally in your browser. Here is how you verify it yourself.',
        }
      : {
          title: 'Privacy',
          desc: 'Redactly verarbeitet keine Nutzerdaten auf Servern. Alles läuft lokal im Browser. So kannst du es selbst prüfen.',
        }
  );

  const h1 = $derived(loc({ de: 'Privacy-Versprechen', en: 'Privacy promise' }));
  const lead1 = $derived(
    loc({
      de: 'Redactly verarbeitet ',
      en: 'Redactly processes ',
    })
  );
  const leadEm = $derived(loc({ de: 'keine', en: 'no' }));
  const lead2 = $derived(
    loc({
      de: ' Nutzerinhalte auf externen Servern. Das ist keine Marketingaussage — es ist technisch unmöglich, weil es keinen Server gibt.',
      en: ' user content on external servers. That is not a marketing claim — it is technically impossible because there is no server.',
    })
  );
  const guaranteesHeading = $derived(loc({ de: 'Explizite Garantien', en: 'Explicit guarantees' }));
  const transparencyTitle = $derived(
    loc({ de: 'Transparenz: Modell-Download vom CDN', en: 'Transparency: model download from CDN' })
  );
  const transparencyIntro = $derived(
    loc({
      de: 'Wenn du den ',
      en: 'When you enable ',
    })
  );
  const transparencyNer = $derived(
    loc({
      de: 'NER-Erkennungsmodus',
      en: 'NER recognition mode',
    })
  );
  const transparencyOr = $derived(loc({ de: ' oder ', en: ' or ' }));
  const transparencyAfter = $derived(
    loc({
      de: ' aktivierst, werden Modelle beim ersten Start einmalig von einem öffentlichen CDN geladen:',
      en: ', models are downloaded once on first use from a public CDN:',
    })
  );
  const transparencyBullet1Pre = $derived(loc({ de: 'NER-Modelle', en: 'NER models' }));
  const transparencyBullet1Mid = $derived(loc({ de: ' werden von ', en: ' come from ' }));
  const transparencyBullet1Post = $derived(
    loc({
      de: ' heruntergeladen (transformers.js).',
      en: ' (transformers.js).',
    })
  );
  const transparencyBullet2Pre = $derived(loc({ de: 'WebLLM-Modelle', en: 'WebLLM models' }));
  const transparencyBullet2Post = $derived(
    loc({
      de: ' werden von einem konfigurierten CDN geladen.',
      en: ' come from a configured CDN.',
    })
  );
  const transparencyWhatNot = $derived(
    loc({
      de: 'Was dabei ',
      en: 'What is ',
    })
  );
  const transparencyNotEm = $derived(loc({ de: 'nicht', en: 'NOT' }));
  const transparencyWhatNotAfter = $derived(
    loc({
      de: ' übertragen wird:',
      en: ' transmitted:',
    })
  );
  const transparencyBody = $derived(
    loc({
      de: ' dein Text, deine Eingaben, deine Mappings — nichts davon. Der Download ist das Modell selbst, nicht deine Daten. Danach werden Modelle lokal im Browser gecacht (IndexedDB/Cache API), sodass kein erneuter Download beim nächsten Besuch nötig ist.',
      en: ' your text, your inputs, your mappings — none of it. The download is the model itself, not your data. Afterwards the models are cached locally in the browser (IndexedDB / Cache API) so no further download is needed on the next visit.',
    })
  );
  const transparencyFooter = $derived(
    loc({
      de: 'Wenn du auch diesen CDN-Request vermeiden willst, nutze nur den ',
      en: 'If you want to avoid this CDN request too, use only the ',
    })
  );
  const transparencyRegexMode = $derived(loc({ de: 'Regex-Modus', en: 'regex mode' }));
  const transparencyFooter2 = $derived(
    loc({
      de: ' — dieser kommt ohne externe Netzwerkanfragen aus.',
      en: ' — it makes no external network requests at all.',
    })
  );

  const verifyHeading = $derived(loc({ de: 'Selbst prüfen', en: 'Verify it yourself' }));
  const verifyLead = $derived(
    loc({
      de: 'Vertraue nicht blindlings — öffne die DevTools und überzeuge dich selbst:',
      en: "Don't take our word for it — open DevTools and see for yourself:",
    })
  );

  const verifySteps = [
    {
      title: { de: 'Schritt 1: DevTools öffnen', en: 'Step 1: open DevTools' },
      bodyPrefix: { de: 'Drücke ', en: 'Press ' },
      keyA: 'F12',
      bodyMid: { de: ' oder ', en: ' or ' },
      keyB: 'Cmd+Option+I',
      bodySuffix: {
        de: ' um die Browser-Entwicklertools zu öffnen.',
        en: ' to open the browser developer tools.',
      },
    },
  ];

  const step2 = $derived(
    loc({ de: 'Schritt 2: Network-Tab auswählen', en: 'Step 2: Network tab' })
  );
  const step2Body = $derived(
    loc({
      de: 'Wechsle zum Tab "Network" (oder "Netzwerk"). Aktiviere "Preserve log" und starte die App.',
      en: 'Switch to the "Network" tab. Enable "Preserve log" and launch the app.',
    })
  );
  const step3 = $derived(
    loc({ de: 'Schritt 3: Filter auf POST/PUT/PATCH', en: 'Step 3: filter on POST/PUT/PATCH' })
  );
  const step3Pre = $derived(loc({ de: 'Filtere nach Methode: ', en: 'Filter by method: ' }));
  const step3After = $derived(
    loc({
      de: '. Gib dann Text in die App ein und beobachte: ',
      en: '. Then type into the app and watch: ',
    })
  );
  const step3Em = $derived(
    loc({ de: 'keine Requests mit deinem Inhalt', en: 'no requests carrying your content' })
  );

  const step4 = $derived(
    loc({ de: 'Schritt 4: Requests auf Inhalt prüfen', en: 'Step 4: inspect request bodies' })
  );
  const step4Body = $derived(
    loc({
      de: 'Alle Requests, die du siehst, sind entweder statische Assets (HTML/CSS/JS) oder — beim NER/WebLLM-Modus — Modell-Downloads. Keiner enthält deinen Text.',
      en: 'Everything you see is either a static asset (HTML/CSS/JS) or — in NER/WebLLM mode — a model download. None of it contains your text.',
    })
  );

  const gdprHeading = $derived(loc({ de: 'DSGVO-Konformität', en: 'GDPR compliance' }));
  const gdprBody = $derived(
    loc({
      de: 'Da Redactly keine personenbezogenen Daten auf Servern verarbeitet oder speichert, entfallen die meisten DSGVO-Anforderungen an den Betreiber (Art. 5–11 DSGVO). Einzig der CDN-Abruf der Modelle stellt technisch einen Drittland-Transfer dar — dies betrifft jedoch nur Modellgewichte, nicht Nutzerdaten. Für den Einsatz in Unternehmensumgebungen empfehlen wir den Regex-Only-Modus oder eine Self-Hosted-Installation mit lokalem Modell-Cache.',
      en: 'Because Redactly never processes or stores personal data on a server, most operator-side GDPR obligations (Arts. 5–11) simply do not apply. The only network activity is the CDN fetch of the models, which is technically a third-country transfer — but it concerns model weights, not user data. For enterprise deployments we recommend regex-only mode or a self-hosted install with a local model cache.',
    })
  );
</script>

<SeoHead title={pageMeta.title} description={pageMeta.desc} path="/privacy" />

<div class="bg-white py-16 sm:py-20">
  <div class="mx-auto max-w-3xl px-4 sm:px-6">
    <div class="mb-12">
      <h1 class="text-4xl font-extrabold tracking-tight text-slate-900">{h1}</h1>
      <p class="mt-4 text-xl text-slate-600">
        {lead1}<em>{leadEm}</em>{lead2}
      </p>
    </div>

    <!-- Guarantees -->
    <section class="mb-12">
      <h2 class="mb-6 text-2xl font-bold text-slate-900">{guaranteesHeading}</h2>
      <div class="space-y-4">
        {#each guarantees as g}
          <div class="flex gap-4 rounded-xl border border-slate-200 p-5">
            <div class="flex-shrink-0 text-2xl">{g.icon}</div>
            <div>
              <h3 class="font-semibold text-slate-900">{loc(g.title)}</h3>
              <p class="mt-1 text-sm leading-relaxed text-slate-600">{loc(g.description)}</p>
            </div>
          </div>
        {/each}
      </div>
    </section>

    <!-- HuggingFace transparency -->
    <section class="mb-12 rounded-2xl border border-amber-200 bg-amber-50 p-6">
      <h2 class="mb-3 flex items-center gap-2 text-xl font-bold text-amber-900">
        <span>⚠️</span>
        {transparencyTitle}
      </h2>
      <div class="prose prose-sm max-w-none text-amber-800">
        <p>
          {transparencyIntro}<strong>{transparencyNer}</strong>{transparencyOr}<strong
            >WebLLM</strong
          >{transparencyAfter}
        </p>
        <ul class="mt-3 space-y-1.5 text-sm">
          <li>
            <strong>{transparencyBullet1Pre}</strong>{transparencyBullet1Mid}<code
              >huggingface.co</code
            >{transparencyBullet1Post}
          </li>
          <li>
            <strong>{transparencyBullet2Pre}</strong>{transparencyBullet2Post}
          </li>
        </ul>
        <p class="mt-3">
          <strong
            >{transparencyWhatNot}<em>{transparencyNotEm}</em>{transparencyWhatNotAfter}</strong
          >{transparencyBody}
        </p>
        <p class="mt-3">
          {transparencyFooter}<strong>{transparencyRegexMode}</strong>{transparencyFooter2}
        </p>
      </div>
    </section>

    <!-- Verify yourself -->
    <section class="mb-12">
      <h2 class="mb-4 text-2xl font-bold text-slate-900">{verifyHeading}</h2>
      <p class="mb-6 text-slate-600">{verifyLead}</p>
      <div class="space-y-4">
        {#each verifySteps as step}
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 class="font-semibold text-slate-900">{loc(step.title)}</h3>
            <p class="mt-1 text-sm text-slate-600">
              {loc(step.bodyPrefix)}<kbd
                class="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-xs"
                >{step.keyA}</kbd
              >{loc(step.bodyMid)}<kbd
                class="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-xs"
                >{step.keyB}</kbd
              >{loc(step.bodySuffix)}
            </p>
          </div>
        {/each}
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 class="font-semibold text-slate-900">{step2}</h3>
          <p class="mt-1 text-sm text-slate-600">{step2Body}</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 class="font-semibold text-slate-900">{step3}</h3>
          <p class="mt-1 text-sm text-slate-600">
            {step3Pre}<code class="rounded bg-slate-200 px-1 text-xs">POST</code>,
            <code class="rounded bg-slate-200 px-1 text-xs">PUT</code>,
            <code class="rounded bg-slate-200 px-1 text-xs">PATCH</code>{step3After}<strong
              >{step3Em}</strong
            >.
          </p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 class="font-semibold text-slate-900">{step4}</h3>
          <p class="mt-1 text-sm text-slate-600">{step4Body}</p>
        </div>
      </div>
    </section>

    <!-- DSGVO note -->
    <section class="rounded-2xl border border-teal-200 bg-teal-50 p-6">
      <h2 class="mb-3 text-xl font-bold text-teal-900">{gdprHeading}</h2>
      <p class="text-sm leading-relaxed text-teal-800">{gdprBody}</p>
    </section>
  </div>
</div>
