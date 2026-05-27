<script lang="ts">
  interface Feature {
    n: string;
    title: string;
    body: string;
  }

  const features: Feature[] = [
    {
      n: 'i',
      title: 'Privatsphäre nicht als Versprechen, sondern als Architektur',
      body: 'Es gibt keinen Server, der deine Eingaben sehen könnte. Erkennung und Maskierung laufen in deinem Browser-Tab — physisch dort, wo du den Text eingibst. Du kannst die Netzwerk-Tab in den DevTools offen lassen, während du arbeitest.',
    },
    {
      n: 'ii',
      title: 'Reversibel, weil eine Antwort nichts wert ist, wenn sie kryptisch bleibt',
      body: 'Jede Maskierung schreibt ein lokales Mapping. Fügst du die LLM-Antwort zurück ein, ersetzt Redactly die Platzhalter wieder durch die echten Werte — du arbeitest weiter, als wäre nichts passiert.',
    },
    {
      n: 'iii',
      title: 'Drei Erkennungsstufen, weil ein Werkzeug verschiedenen Texten gerecht werden muss',
      body: 'Regex für Strukturen wie IBANs, E-Mails, API-Keys. NER für freie Personennamen und Orte. WebLLM für kontextuelle Erkennung, wenn nichts anderes greift. Du wählst, was du brauchst.',
    },
    {
      n: 'iv',
      title: 'Dateiformate ohne Umwege über fremde Server',
      body: '.txt, .md, .eml, .pdf, .docx — alle im Browser geparst. Keine Cloud-Konversion, kein Upload an einen Document-Service. Was du hochlädst, bleibt da, wo du es hochlädst.',
    },
    {
      n: 'v',
      title: 'Open Source als Verifikation, nicht als Marketing',
      body: 'Der gesamte Quellcode liegt öffentlich auf GitHub. „Vertrau uns" ist keine Antwort auf eine Datenschutz-Frage. „Lies den Code" schon.',
    },
    {
      n: 'vi',
      title: 'Deutsch und Englisch ab Werk, multilingual auf Wunsch',
      body: 'Die Pattern-Bibliothek deckt deutschsprachige Konventionen ab (IBANs, Steuer-ID, Telefonformate). Mit dem NER-Modus erweiterst du nahtlos auf weitere Sprachen.',
    },
  ];
</script>

<section class="border-t border-[color:var(--color-rule)] py-24 sm:py-32">
  <div class="mx-auto max-w-6xl px-5 sm:px-8">
    <header class="mb-16 grid grid-cols-1 gap-8 lg:grid-cols-12">
      <div class="lg:col-span-3">
        <span class="label-caps">§ 2 — Was es leistet</span>
      </div>
      <div class="lg:col-span-9">
        <h2
          class="font-[family-name:var(--font-display)] text-[2.25rem] leading-[1.05] italic tracking-tight text-[color:var(--color-ink)] sm:text-[3rem]"
        >
          Sechs Eigenschaften, ohne die das ganze Konzept nicht trägt.
        </h2>
      </div>
    </header>

    <div class="grid grid-cols-1 gap-x-12 gap-y-14 md:grid-cols-2">
      {#each features as feature, i}
        <article
          class="grid grid-cols-[3rem_1fr] gap-x-5 border-t border-[color:var(--color-rule)] pt-6"
          class:md:border-t-0={i < 2}
          class:md:pt-0={i < 2}
        >
          <div class="pt-1">
            <span
              class="font-[family-name:var(--font-display)] text-2xl italic text-[color:var(--color-rust)]"
            >
              {feature.n}
            </span>
          </div>
          <div>
            <h3
              class="font-[family-name:var(--font-display)] text-[1.375rem] leading-[1.2] text-[color:var(--color-ink)]"
            >
              {feature.title}
            </h3>
            <p class="mt-3 text-[0.95rem] leading-[1.65] text-[color:var(--color-ink-soft)]">
              {feature.body}
            </p>
          </div>
        </article>
      {/each}
    </div>
  </div>
</section>
