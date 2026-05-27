<script lang="ts">
  import SeoHead from '$lib/components/SeoHead.svelte';

  interface FaqItem {
    question: string;
    answer: string;
  }

  const faqs: FaqItem[] = [
    {
      question: 'Verlassen meine Daten den Browser?',
      answer:
        'Nein — mit einer Ausnahme: Wenn du den NER- oder WebLLM-Modus nutzt, werden die Modelle beim ersten Start einmalig von einem öffentlichen CDN (HuggingFace) heruntergeladen. Dabei werden ausschließlich Modellgewichte übertragen, niemals dein Text oder deine Daten. Danach werden die Modelle lokal gecacht. Im reinen Regex-Modus gibt es gar keine externen Netzwerkanfragen.',
    },
    {
      question: 'Welche Sprachen werden erkannt?',
      answer:
        'Deutsch und Englisch werden out-of-the-box durch Regex-Pattern unterstützt. Mit dem NER-Modus (transformers.js) erweiterst du die Erkennung auf weitere Sprachen — das zugrundeliegende Modell unterstützt über 100 Sprachen. Im WebLLM-Modus hängt die Sprachunterstützung vom gewählten Modell ab.',
    },
    {
      question: "Was ist der Unterschied zu ChatGPT's eigener Maskierung?",
      answer:
        'ChatGPT und ähnliche Dienste bieten teils eigene "Datenschutzmodi" oder Memory-Deaktivierung an. Der entscheidende Unterschied: Diese verhindern nicht, dass dein Text beim Anbieter ankommt und verarbeitet wird — sie begrenzen nur die Speicherung. Redactly maskiert deinen Text, bevor er deinen Browser verlässt. Das LLM sieht niemals die echten Werte, sondern nur anonymisierte Platzhalter.',
    },
    {
      question: 'Kann ich PDFs oder Word-Dokumente verwenden?',
      answer:
        'Ja. Redactly unterstützt .txt, .md, .eml, .pdf und .docx. PDF-Parsing läuft via pdf.js direkt im Browser, DOCX-Parsing über einen lokalen Parser. Keine Datei wird jemals hochgeladen oder an einen Server gesendet.',
    },
    {
      question: 'Was passiert, wenn ich den Tab schließe?',
      answer:
        'Das PII-Mapping (die Zuordnung Platzhalter → Originalwert) ist session-scoped und lebt nur im Arbeitsspeicher des Browser-Tabs. Wenn du den Tab schließt, geht das Mapping verloren — das ist by design und ein Privacy-Feature. Halte den Tab offen, solange du auf eine LLM-Antwort wartest, die du zurückübersetzen möchtest.',
    },
    {
      question: 'Ist Redactly DSGVO-konform?',
      answer:
        'Da Redactly keine personenbezogenen Daten auf Servern verarbeitet oder speichert, entfallen die meisten DSGVO-Pflichten für den Betreiber. Die einzige Netzwerkaktivität ist der einmalige CDN-Download der NER/WebLLM-Modelle — dabei werden keine Nutzerdaten übermittelt. Für Unternehmensumgebungen mit strikten Anforderungen empfehlen wir den Regex-Only-Modus oder eine Self-Hosted-Installation.',
    },
    {
      question: 'Was kostet Redactly?',
      answer:
        'Redactly ist kostenlos und Open Source (MIT-Lizenz). Es gibt keine Pro-Pläne, keine Subscriptions, keine versteckten Kosten. Du kannst den Quellcode forken, selbst hosten und anpassen — ohne Einschränkungen.',
    },
    {
      question: 'Wie kann ich beitragen?',
      answer:
        'Das Projekt freut sich über Beiträge! Öffne ein Issue für Bug Reports oder Feature-Requests, oder erstelle direkt einen Pull Request. Den Quellcode findest du auf GitHub unter github.com/moritz-hauff/Redactly. Bitte lies das CONTRIBUTING.md im Repo, bevor du einen großen PR erstellst.',
    },
    {
      question: 'Welche Browser werden unterstützt?',
      answer:
        'Alle modernen Browser: Chrome 113+, Firefox 115+, Safari 16.4+, Edge 113+. Für WebLLM wird WebGPU benötigt (Chrome 113+, experimentell in Firefox). Für den Regex- und NER-Modus reicht jeder modernen Browser.',
    },
    {
      question: 'Kann ich Redactly offline nutzen?',
      answer:
        'Den Regex-Modus kannst du nach dem ersten Laden vollständig offline nutzen — er benötigt keine Netzwerkverbindung. Den NER-Modus kannst du offline nutzen, sobald das Modell einmalig heruntergeladen und gecacht wurde. WebLLM ebenfalls nach dem initialen Modell-Download.',
    },
  ];

  let openIndex = $state<number | null>(null);

  function toggle(i: number) {
    openIndex = openIndex === i ? null : i;
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
</script>

<SeoHead
  title="FAQ"
  description="Häufig gestellte Fragen zu Redactly — Datenschutz, Sprachen, Dateiformate, Modi."
  path="/faq"
/>

<svelte:head>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html `<script type="application/ld+json">${JSON.stringify(faqJsonLd)}</` + `script>`}
</svelte:head>

<div class="bg-white py-16 sm:py-20">
  <div class="mx-auto max-w-3xl px-4 sm:px-6">
    <div class="mb-12 text-center">
      <h1 class="text-4xl font-extrabold tracking-tight text-slate-900">Häufige Fragen</h1>
      <p class="mt-4 text-xl text-slate-600">Alles, was du über Redactly wissen willst.</p>
    </div>

    <div class="divide-y divide-slate-200 rounded-2xl border border-slate-200">
      {#each faqs as faq, i}
        <div class="p-0">
          <button
            class="flex w-full items-start justify-between px-6 py-5 text-left"
            onclick={() => toggle(i)}
            aria-expanded={openIndex === i}
          >
            <span class="pr-4 font-semibold text-slate-900">{faq.question}</span>
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
              <p class="text-sm leading-relaxed text-slate-600">{faq.answer}</p>
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <div class="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
      <p class="text-slate-700">
        Noch eine Frage? Öffne ein
        <a
          href="https://github.com/moritz-hauff/Redactly/issues"
          target="_blank"
          rel="noopener noreferrer"
          class="font-medium text-teal-600 hover:text-teal-700"
        >
          GitHub Issue
        </a>
        — wir antworten so schnell wie möglich.
      </p>
    </div>
  </div>
</div>
