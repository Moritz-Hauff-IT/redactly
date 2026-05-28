<script lang="ts">
  interface Feature {
    id: string;
    title: string;
    body: string;
    tag: string;
  }

  const features: Feature[] = [
    {
      id: '0x01',
      title: 'No server in the loop.',
      body: 'There is no backend that could see your input. Detection and masking execute in the same browser process where you type. You can keep DevTools → Network open while you work.',
      tag: 'architecture',
    },
    {
      id: '0x02',
      title: 'Reversible by design.',
      body: 'Every mask writes a local mapping. Paste the LLM response back and Redactly substitutes placeholders for the real values. The mapping never leaves this tab.',
      tag: 'workflow',
    },
    {
      id: '0x03',
      title: 'Three detection layers.',
      body: 'Regex for structured patterns (IBANs, emails, API keys). NER for free-form names and locations. WebLLM for context-aware detection on the trickiest cases. Pick what you need.',
      tag: 'engine',
    },
    {
      id: '0x04',
      title: 'File formats handled in-tab.',
      body: '.txt, .md, .eml, .pdf, .docx — all parsed in the browser via WebAssembly. No cloud conversion, no upload to a document service. What you load stays where you loaded it.',
      tag: 'formats',
    },
    {
      id: '0x05',
      title: 'Open source as verification.',
      body: 'The entire source tree is on GitHub. "Trust us" is not a satisfying answer to a privacy question. "Read the code" is.',
      tag: 'license',
    },
    {
      id: '0x06',
      title: 'Local-first, multilingual.',
      body: 'German and English patterns shipped. NER mode extends seamlessly to ~100 more languages. No locale calls home. Translation happens inside your machine.',
      tag: 'i18n',
    },
  ];
</script>

<section class="border-b border-[color:var(--color-line)] py-24 sm:py-32">
  <div class="mx-auto max-w-7xl px-5 sm:px-8">
    <!-- Section header -->
    <header
      class="mb-16 flex flex-wrap items-end justify-between gap-6 border-b border-[color:var(--color-line-strong)] pb-4"
    >
      <div>
        <span class="label label-signal">02 / features</span>
        <h2 class="display mt-3 text-[2.5rem] text-[color:var(--color-text)] sm:text-[3.5rem]">
          Six properties without<br />which the concept collapses.
        </h2>
      </div>
      <div
        class="font-[family-name:var(--font-mono)] text-[0.75rem] text-[color:var(--color-text-mute)]"
      >
        n=6 · sorted by priority
      </div>
    </header>

    <!-- Module grid -->
    <div
      class="grid grid-cols-1 gap-x-px gap-y-px md:grid-cols-2 lg:grid-cols-3 bg-[color:var(--color-line)]"
    >
      {#each features as feature}
        <article
          class="group relative bg-[color:var(--color-shell)] p-8 transition-colors hover:bg-[color:var(--color-shell-raised)]"
        >
          <!-- ID + tag bar -->
          <div class="mb-6 flex items-center justify-between">
            <span
              class="font-[family-name:var(--font-mono)] text-[0.8rem] font-bold text-[color:var(--color-signal)]"
            >
              {feature.id}
            </span>
            <span class="label">{feature.tag}</span>
          </div>

          <!-- Title -->
          <h3 class="display text-[1.5rem] leading-tight text-[color:var(--color-text)]">
            {feature.title}
          </h3>

          <!-- Body -->
          <p
            class="mt-4 font-[family-name:var(--font-mono)] text-[0.85rem] leading-[1.7] text-[color:var(--color-text-dim)]"
          >
            {feature.body}
          </p>

          <!-- Hover-revealed arrow -->
          <div
            class="mt-6 flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-[0.7rem] tracking-[0.1em] uppercase text-[color:var(--color-text-mute)] transition-colors group-hover:text-[color:var(--color-signal)]"
          >
            <span>read</span>
            <span aria-hidden="true">→</span>
          </div>
        </article>
      {/each}
    </div>
  </div>
</section>
