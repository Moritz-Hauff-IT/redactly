<script lang="ts">
  import CtaButton from './CtaButton.svelte';
</script>

<section class="relative overflow-hidden pt-16 pb-24 sm:pt-24 sm:pb-32">
  <!-- Editorial meta strip -->
  <div class="mx-auto mb-16 max-w-6xl px-5 sm:px-8">
    <div class="flex items-baseline justify-between border-b border-[color:var(--color-rule)] pb-3">
      <span class="label-caps">Bd. I · Ausg. 1</span>
      <span class="label-caps hidden sm:inline">Privatsphäre als Voreinstellung</span>
      <span class="label-caps">Open Source · MIT</span>
    </div>
  </div>

  <div class="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-5 sm:px-8 lg:grid-cols-12 lg:gap-16">
    <!-- Left column: marginalia + section marker -->
    <aside class="hidden lg:col-span-2 lg:block">
      <div class="sticky top-28">
        <div class="marginalia mb-2">§ 1</div>
        <div class="h-px w-12 bg-[color:var(--color-ink)]"></div>
        <p class="marginalia mt-4 max-w-[10rem] leading-relaxed text-[color:var(--color-ink-soft)]">
          Was hier passiert, passiert in deinem Browser. Nicht auf einem Server. Nicht in einer
          Cloud. Hier.
        </p>
      </div>
    </aside>

    <!-- Center column: headline + body -->
    <div class="lg:col-span-8">
      <h1
        class="font-[family-name:var(--font-display)] text-[2.75rem] leading-[1.02] tracking-tight text-[color:var(--color-ink)] sm:text-[3.5rem] lg:text-[4.5rem]"
      >
        Was dein LLM nie zu sehen bekommen sollte —
        <span class="redact-sweep italic">deine Daten</span>.
      </h1>

      <p
        class="mt-10 max-w-2xl text-[1.125rem] leading-[1.7] text-[color:var(--color-ink-soft)] sm:text-[1.25rem]"
      >
        <strong class="font-medium text-[color:var(--color-ink)]">Redactly</strong> ersetzt Namen, Adressen,
        Schlüssel und Geheimnisse durch nummerierte Platzhalter — direkt in deinem Browser, bevor irgendetwas
        an ChatGPT, Claude oder ein anderes Modell geht. Die Antwort fügst du zurück ein und bekommst
        die echten Werte wieder eingesetzt.
      </p>

      <!-- Demonstration: live redaction example -->
      <figure
        class="mt-12 border-y border-[color:var(--color-rule)] bg-[color:var(--color-paper-deep)]/40 py-6"
      >
        <figcaption class="label-caps mb-3 px-1">Aus einem Email-Entwurf →</figcaption>
        <p
          class="px-1 font-[family-name:var(--font-mono)] text-[0.95rem] leading-7 text-[color:var(--color-ink)]"
        >
          Hallo <span class="redact">Martin Müller</span>, anbei die Rechnung an
          <span class="redact">martin@müller.de</span>, IBAN
          <span class="redact">DE89 3704 0044 0532 0130 00</span>.
        </p>
        <figcaption class="mt-4 mb-2 px-1 label-caps">→ Das sieht das LLM</figcaption>
        <p
          class="px-1 font-[family-name:var(--font-mono)] text-[0.95rem] leading-7 text-[color:var(--color-ink-soft)]"
        >
          Hallo <span class="text-[color:var(--color-rust)]">[PERSON_1]</span>, anbei die Rechnung
          an <span class="text-[color:var(--color-rust)]">[EMAIL_1]</span>, IBAN
          <span class="text-[color:var(--color-rust)]">[IBAN_1]</span>.
        </p>
      </figure>

      <!-- CTAs -->
      <div class="mt-10 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <CtaButton size="lg" />
        <a
          href="/docs"
          class="group inline-flex items-baseline gap-2 font-[family-name:var(--font-display)] text-lg italic text-[color:var(--color-ink-soft)] underline decoration-[color:var(--color-rule)] decoration-1 underline-offset-[6px] transition-all hover:text-[color:var(--color-ink)] hover:decoration-[color:var(--color-rust)]"
        >
          oder erst nachlesen
          <span class="not-italic font-[family-name:var(--font-mono)] text-sm">↗</span>
        </a>
      </div>
    </div>

    <!-- Right column: hard facts table -->
    <aside class="lg:col-span-2">
      <div class="border-t border-[color:var(--color-ink)] pt-3">
        <span class="label-caps">Kurzcheck</span>
        <dl class="mt-4 space-y-3">
          <div>
            <dt class="marginalia">Hosting</dt>
            <dd class="text-sm text-[color:var(--color-ink)]">100 % Browser</dd>
          </div>
          <div>
            <dt class="marginalia">Server-Logs</dt>
            <dd class="text-sm text-[color:var(--color-ink)]">keine</dd>
          </div>
          <div>
            <dt class="marginalia">Tracking</dt>
            <dd class="text-sm text-[color:var(--color-ink)]">keines</dd>
          </div>
          <div>
            <dt class="marginalia">Reversibel</dt>
            <dd class="text-sm text-[color:var(--color-ink)]">ja</dd>
          </div>
          <div>
            <dt class="marginalia">Lizenz</dt>
            <dd class="text-sm text-[color:var(--color-ink)]">MIT</dd>
          </div>
        </dl>
      </div>
    </aside>
  </div>
</section>
