<script lang="ts">
  import SeoHead from '$lib/components/SeoHead.svelte';
  import { loc, currentLocale } from '$lib/i18n/locale.svelte.js';

  interface BilingualString {
    de: string;
    en: string;
  }
  interface FaqItem {
    question: BilingualString;
    answer: BilingualString;
  }

  const faqs: FaqItem[] = [
    {
      question: {
        de: 'Verlassen meine Daten den Browser?',
        en: 'Does my data ever leave the browser?',
      },
      answer: {
        de: 'Nein — mit einer Ausnahme: Wenn du den NER- oder WebLLM-Modus nutzt, werden die Modelle beim ersten Start einmalig von einem öffentlichen CDN (HuggingFace) heruntergeladen. Dabei werden ausschließlich Modellgewichte übertragen, niemals dein Text oder deine Daten. Danach werden die Modelle lokal gecacht. Im reinen Regex-Modus gibt es gar keine externen Netzwerkanfragen.',
        en: 'No — with one exception: when you enable NER or WebLLM mode the models are downloaded once on first use from a public CDN (HuggingFace). Only the model weights cross the network, never your text or data. After that the models are cached locally. In pure regex mode there are no external network requests at all.',
      },
    },
    {
      question: {
        de: 'Welche Sprachen werden erkannt?',
        en: 'Which languages are recognised?',
      },
      answer: {
        de: 'Deutsch und Englisch werden out-of-the-box durch Regex-Pattern unterstützt. Mit dem NER-Modus (transformers.js) erweiterst du die Erkennung auf weitere Sprachen — das zugrundeliegende Modell unterstützt über 100 Sprachen. Im WebLLM-Modus hängt die Sprachunterstützung vom gewählten Modell ab.',
        en: 'German and English are supported out of the box via regex patterns. NER mode (transformers.js) extends recognition to many more languages — the underlying model covers 100+ languages. In WebLLM mode language coverage depends on the model you pick.',
      },
    },
    {
      question: {
        de: "Was ist der Unterschied zu ChatGPT's eigener Maskierung?",
        en: "What's the difference vs. ChatGPT's own masking?",
      },
      answer: {
        de: 'ChatGPT und ähnliche Dienste bieten teils eigene "Datenschutzmodi" oder Memory-Deaktivierung an. Der entscheidende Unterschied: Diese verhindern nicht, dass dein Text beim Anbieter ankommt und verarbeitet wird — sie begrenzen nur die Speicherung. Redactly maskiert deinen Text, bevor er deinen Browser verlässt. Das LLM sieht niemals die echten Werte, sondern nur anonymisierte Platzhalter.',
        en: "ChatGPT and similar services offer their own 'privacy modes' and memory toggles. The crucial difference: those don't stop your text from reaching the provider and being processed — they only limit retention. Redactly masks your text BEFORE it leaves your browser. The LLM never sees the real values, only anonymised placeholders.",
      },
    },
    {
      question: {
        de: 'Kann ich PDFs oder Word-Dokumente verwenden?',
        en: 'Can I use PDFs or Word documents?',
      },
      answer: {
        de: 'Ja. Redactly unterstützt .txt, .md, .eml, .pdf, .docx, .xlsx, .pptx, viele Code- und Konfig-Formate sowie Bilder (PNG/JPG/WebP via OCR). PDF-, Excel- und PowerPoint-Downloads bleiben layout-erhaltend — nur die PII-Stellen werden weiß überdeckt und mit Platzhaltern beschriftet. Keine Datei wird jemals hochgeladen oder an einen Server gesendet.',
        en: 'Yes. Redactly supports .txt, .md, .eml, .pdf, .docx, .xlsx, .pptx, many code/config formats, and images (PNG/JPG/WebP via OCR). PDF, Excel and PowerPoint downloads stay layout-preserving — only the PII regions are whited out and relabelled. No file is ever uploaded or sent to a server.',
      },
    },
    {
      question: {
        de: 'Was passiert, wenn ich den Tab schließe?',
        en: 'What happens when I close the tab?',
      },
      answer: {
        de: 'Das PII-Mapping (die Zuordnung Platzhalter → Originalwert) ist session-scoped und lebt nur im Arbeitsspeicher des Browser-Tabs. Wenn du den Tab schließt, geht das Mapping verloren — das ist by design und ein Privacy-Feature. Halte den Tab offen, solange du auf eine LLM-Antwort wartest, die du zurückübersetzen möchtest.',
        en: "The PII mapping (placeholder → original) is session-scoped and lives only in the browser tab's memory. Closing the tab destroys the mapping — that's by design, and it's a privacy feature. Keep the tab open while you're waiting on an LLM response you want to restore.",
      },
    },
    {
      question: {
        de: 'Ist Redactly DSGVO-konform?',
        en: 'Is Redactly GDPR-compliant?',
      },
      answer: {
        de: 'Da Redactly keine personenbezogenen Daten auf Servern verarbeitet oder speichert, entfallen die meisten DSGVO-Pflichten für den Betreiber. Die einzige Netzwerkaktivität ist der einmalige CDN-Download der NER/WebLLM-Modelle — dabei werden keine Nutzerdaten übermittelt. Für Unternehmensumgebungen mit strikten Anforderungen empfehlen wir den Regex-Only-Modus oder eine Self-Hosted-Installation.',
        en: "Because Redactly never processes or stores personal data on a server, most GDPR obligations for the operator simply don't apply. The only network activity is the one-time CDN download of the NER/WebLLM models — no user data is transmitted. For enterprise environments with strict requirements we recommend regex-only mode or a self-hosted install.",
      },
    },
    {
      question: {
        de: 'Was kostet Redactly?',
        en: 'How much does Redactly cost?',
      },
      answer: {
        de: 'Redactly ist kostenlos und Open Source (MIT-Lizenz). Es gibt keine Pro-Pläne, keine Subscriptions, keine versteckten Kosten. Du kannst den Quellcode forken, selbst hosten und anpassen — ohne Einschränkungen.',
        en: 'Redactly is free and open source (MIT licence). No pro tier, no subscriptions, no hidden costs. Fork the source, self-host, customise — no restrictions.',
      },
    },
    {
      question: {
        de: 'Wie kann ich beitragen?',
        en: 'How can I contribute?',
      },
      answer: {
        de: 'Das Projekt freut sich über Beiträge! Öffne ein Issue für Bug Reports oder Feature-Requests, oder erstelle direkt einen Pull Request. Den Quellcode findest du auf GitHub unter github.com/moritz-hauff-it/redactly. Bitte lies das CONTRIBUTING.md im Repo, bevor du einen großen PR erstellst.',
        en: 'Contributions are very welcome! Open an issue for bug reports or feature requests, or send a pull request directly. Source is on GitHub at github.com/moritz-hauff-it/redactly. Please read CONTRIBUTING.md in the repo before sending a large PR.',
      },
    },
    {
      question: {
        de: 'Welche Browser werden unterstützt?',
        en: 'Which browsers are supported?',
      },
      answer: {
        de: 'Alle modernen Browser: Chrome 113+, Firefox 115+, Safari 16.4+, Edge 113+. Für WebLLM wird WebGPU benötigt (Chrome 113+, experimentell in Firefox). Für den Regex- und NER-Modus reicht jeder moderne Browser.',
        en: 'All modern browsers: Chrome 113+, Firefox 115+, Safari 16.4+, Edge 113+. WebLLM requires WebGPU (Chrome 113+, experimental in Firefox). Regex and NER modes work in any recent browser.',
      },
    },
    {
      question: {
        de: 'Kann ich Redactly offline nutzen?',
        en: 'Can I use Redactly offline?',
      },
      answer: {
        de: 'Den Regex-Modus kannst du nach dem ersten Laden vollständig offline nutzen — er benötigt keine Netzwerkverbindung. Den NER-Modus kannst du offline nutzen, sobald das Modell einmalig heruntergeladen und gecacht wurde. WebLLM ebenfalls nach dem initialen Modell-Download.',
        en: 'Regex mode works fully offline after the first page load — no network needed. NER mode works offline once the model has been downloaded and cached. WebLLM the same after its initial model download.',
      },
    },
  ];

  let openIndex = $state<number | null>(null);

  function toggle(i: number) {
    openIndex = openIndex === i ? null : i;
  }

  const lang = $derived(currentLocale());
  const faqJsonLd = $derived({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: lang === 'en' ? 'en' : 'de',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question[lang],
      acceptedAnswer: { '@type': 'Answer', text: f.answer[lang] },
    })),
  });

  const pageMeta = $derived(
    lang === 'en'
      ? {
          title: 'FAQ',
          desc: 'Frequently asked questions about Redactly — privacy, languages, file formats, modes.',
        }
      : {
          title: 'FAQ',
          desc: 'Häufig gestellte Fragen zu Redactly — Datenschutz, Sprachen, Dateiformate, Modi.',
        }
  );

  const heading = $derived(loc({ de: 'Häufige Fragen', en: 'Frequently asked questions' }));
  const subheading = $derived(
    loc({
      de: 'Alles, was du über Redactly wissen willst.',
      en: 'Everything worth knowing about Redactly.',
    })
  );
  const ctaText = $derived(
    loc({
      de: 'Noch eine Frage? Öffne ein',
      en: 'Another question? Open a',
    })
  );
  const ctaAfter = $derived(
    loc({
      de: '— wir antworten so schnell wie möglich.',
      en: '— we reply as quickly as we can.',
    })
  );
</script>

<SeoHead title={pageMeta.title} description={pageMeta.desc} path="/faq" />

<svelte:head>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html `<script type="application/ld+json">${JSON.stringify(faqJsonLd)}</` + `script>`}
</svelte:head>

<div class="bg-white py-16 sm:py-20">
  <div class="mx-auto max-w-3xl px-4 sm:px-6">
    <div class="mb-12 text-center">
      <h1 class="text-4xl font-extrabold tracking-tight text-slate-900">{heading}</h1>
      <p class="mt-4 text-xl text-slate-600">{subheading}</p>
    </div>

    <div class="divide-y divide-slate-200 rounded-2xl border border-slate-200">
      {#each faqs as faq, i}
        <div class="p-0">
          <button
            class="flex w-full items-start justify-between px-6 py-5 text-left"
            onclick={() => toggle(i)}
            aria-expanded={openIndex === i}
          >
            <span class="pr-4 font-semibold text-slate-900">{loc(faq.question)}</span>
            <svg
              class="h-5 w-5 flex-shrink-0 text-slate-400 transition-transform {openIndex === i
                ? 'rotate-180'
                : ''}"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
          {#if openIndex === i}
            <div class="px-6 pb-5">
              <p class="text-sm leading-relaxed text-slate-600">{loc(faq.answer)}</p>
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <div class="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
      <p class="text-slate-700">
        {ctaText}
        <a
          href="https://github.com/moritz-hauff-it/redactly/issues"
          target="_blank"
          rel="noopener noreferrer"
          class="font-medium text-teal-600 hover:text-teal-700"
        >
          GitHub Issue
        </a>
        {ctaAfter}
      </p>
    </div>
  </div>
</div>
