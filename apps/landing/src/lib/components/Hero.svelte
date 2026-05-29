<script lang="ts">
  import CtaButton from './CtaButton.svelte';
  import { localizedHref } from '$lib/i18n/locale.svelte.js';
</script>

<section
  class="relative overflow-hidden border-b border-[color:var(--color-line)] pt-16 pb-24 sm:pt-24 sm:pb-32"
>
  <!-- Corner brackets — HUD frame -->
  <div
    class="pointer-events-none absolute top-8 left-8 hidden h-6 w-6 border-t-2 border-l-2 border-[color:var(--color-signal)] sm:block"
  ></div>
  <div
    class="pointer-events-none absolute top-8 right-8 hidden h-6 w-6 border-t-2 border-r-2 border-[color:var(--color-signal)] sm:block"
  ></div>

  <div class="mx-auto max-w-7xl px-5 sm:px-8">
    <!-- Top meta row -->
    <div class="mb-12 flex flex-wrap items-center gap-x-6 gap-y-2">
      <span class="label-signal label">> redactly_init</span>
      <span class="label">// browser-resident pii masking</span>
    </div>

    <!-- Massive headline -->
    <div class="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-10">
      <div class="lg:col-span-9">
        <h1
          class="display text-[3rem] text-[color:var(--color-text)] sm:text-[5rem] lg:text-[6.5rem]"
        >
          The data your LLM
          <br />
          <span class="text-[color:var(--color-text-dim)]">should never</span>
          <br />
          <span class="text-[color:var(--color-text)]">see —</span>
          <span class="redact-sweep">redacted</span><span class="text-[color:var(--color-signal)]"
            >.</span
          >
        </h1>

        <p
          class="mt-12 max-w-2xl font-[family-name:var(--font-mono)] text-[0.95rem] leading-[1.75] text-[color:var(--color-text-dim)]"
        >
          <span class="text-[color:var(--color-signal)]">$</span> Names, addresses, IBANs, API keys, secrets
          — replaced with stable placeholders directly in your browser tab. Send the redacted version
          to ChatGPT or Claude. Paste the response back. Originals get restored locally. Nothing transits
          a server we control.
        </p>

        <!-- CTAs -->
        <div class="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <CtaButton size="lg" />
          <a
            href={localizedHref('/docs')}
            class="group inline-flex items-center gap-2 border border-[color:var(--color-line-strong)] px-6 py-4 font-[family-name:var(--font-mono)] text-[0.8rem] tracking-[0.1em] uppercase text-[color:var(--color-text-dim)] transition-all hover:border-[color:var(--color-text)] hover:text-[color:var(--color-text)]"
          >
            cat readme.md
            <span class="transition-transform group-hover:translate-x-0.5" aria-hidden="true"
              >→</span
            >
          </a>
        </div>
      </div>

      <!-- Right side: system specs panel -->
      <aside class="lg:col-span-3">
        <div
          class="border border-[color:var(--color-line-strong)] bg-[color:var(--color-shell-raised)]"
        >
          <div
            class="flex items-center justify-between border-b border-[color:var(--color-line-strong)] px-4 py-2.5"
          >
            <span class="label">system.specs</span>
            <span
              class="font-[family-name:var(--font-mono)] text-[0.6rem] text-[color:var(--color-text-mute)]"
              >0xR3D</span
            >
          </div>
          <dl
            class="divide-y divide-[color:var(--color-line)] font-[family-name:var(--font-mono)] text-[0.75rem]"
          >
            {#each [{ k: 'runtime', v: 'browser', vClass: 'text-[color:var(--color-ok)]' }, { k: 'server', v: 'none', vClass: 'text-[color:var(--color-ok)]' }, { k: 'telemetry', v: 'disabled', vClass: 'text-[color:var(--color-ok)]' }, { k: 'reversible', v: 'yes', vClass: 'text-[color:var(--color-signal)]' }, { k: 'detection', v: '3 layers', vClass: 'text-[color:var(--color-text)]' }, { k: 'license', v: 'mit', vClass: 'text-[color:var(--color-text)]' }] as spec}
              <div class="flex items-center justify-between px-4 py-2.5">
                <dt class="text-[color:var(--color-text-mute)]">{spec.k}</dt>
                <dd class={spec.vClass}>{spec.v}</dd>
              </div>
            {/each}
          </dl>
        </div>
      </aside>
    </div>

    <!-- Live demo block — full width below headline -->
    <div
      class="mt-20 border border-[color:var(--color-line-strong)] bg-[color:var(--color-shell-raised)]"
    >
      <!-- Tabs/header -->
      <div
        class="flex items-center gap-4 border-b border-[color:var(--color-line-strong)] px-4 py-2.5"
      >
        <div class="flex items-center gap-1.5">
          <span class="h-2.5 w-2.5 bg-[color:var(--color-warn)]"></span>
          <span class="h-2.5 w-2.5 bg-[color:var(--color-signal)]"></span>
          <span class="h-2.5 w-2.5 bg-[color:var(--color-ok)]"></span>
        </div>
        <span
          class="font-[family-name:var(--font-mono)] text-[0.7rem] tracking-[0.1em] text-[color:var(--color-text-mute)] uppercase"
        >
          email_to_chatgpt.txt
        </span>
        <span class="ml-auto status-row text-[color:var(--color-ok)]">
          <span class="status-dot"></span>
          analyzed
        </span>
      </div>

      <!-- Two-panel demo -->
      <div
        class="grid grid-cols-1 divide-y divide-[color:var(--color-line)] md:grid-cols-2 md:divide-x md:divide-y-0"
      >
        <!-- Left: input -->
        <div class="px-5 py-6">
          <div class="mb-3 flex items-center justify-between">
            <span class="label">input</span>
            <span
              class="font-[family-name:var(--font-mono)] text-[0.65rem] text-[color:var(--color-text-mute)]"
              >your draft</span
            >
          </div>
          <p
            class="font-[family-name:var(--font-mono)] text-[0.875rem] leading-[1.85] text-[color:var(--color-text)]"
          >
            Hallo <span
              class="bg-[color:var(--color-signal-soft)] text-[color:var(--color-signal)] px-1"
              >Martin Müller</span
            >, anbei die Rechnung an
            <span class="bg-[color:var(--color-signal-soft)] text-[color:var(--color-signal)] px-1"
              >martin@müller.de</span
            >. Bitte überweisen auf IBAN
            <span class="bg-[color:var(--color-signal-soft)] text-[color:var(--color-signal)] px-1"
              >DE89 3704 0044 0532 0130 00</span
            >.
          </p>
        </div>

        <!-- Right: redacted -->
        <div class="px-5 py-6 bg-[color:var(--color-shell-sunken)]">
          <div class="mb-3 flex items-center justify-between">
            <span class="label label-signal">redacted</span>
            <span
              class="font-[family-name:var(--font-mono)] text-[0.65rem] text-[color:var(--color-text-mute)]"
              >→ to llm</span
            >
          </div>
          <p
            class="font-[family-name:var(--font-mono)] text-[0.875rem] leading-[1.85] text-[color:var(--color-text-dim)]"
          >
            Hallo <span class="placeholder-token">[PERSON_1]</span>, anbei die Rechnung an
            <span class="placeholder-token">[EMAIL_1]</span>. Bitte überweisen auf IBAN
            <span class="placeholder-token">[IBAN_1]</span>.<span class="cursor ml-0.5"></span>
          </p>
        </div>
      </div>

      <!-- Footer command line -->
      <div
        class="border-t border-[color:var(--color-line-strong)] bg-[color:var(--color-shell-sunken)] px-4 py-2 font-[family-name:var(--font-mono)] text-[0.7rem] text-[color:var(--color-text-mute)]"
      >
        > <span class="text-[color:var(--color-signal)]">3</span> entities detected ·
        <span class="text-[color:var(--color-ok)]">reversible</span> mapping stored ·
        <span class="text-[color:var(--color-text-dim)]">tab.local</span>
      </div>
    </div>
  </div>
</section>
