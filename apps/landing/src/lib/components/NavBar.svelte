<script lang="ts">
  import { APP_URL } from '$lib/env';

  let menuOpen = $state(false);

  const navLinks = [
    { href: '/features', label: 'Funktionen' },
    { href: '/docs', label: 'Dokumentation' },
    { href: '/privacy', label: 'Datenschutz' },
    { href: '/faq', label: 'FAQ' },
    { href: '/blog', label: 'Journal' },
  ];
</script>

<header
  class="sticky top-0 z-50 border-b border-[color:var(--color-rule)] bg-[color:var(--color-paper)]/85 backdrop-blur"
>
  <nav class="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
    <!-- Wordmark with literal redaction bar -->
    <a href="/" class="group flex items-baseline gap-1 text-[color:var(--color-ink)]">
      <span
        class="font-[family-name:var(--font-display)] text-[1.75rem] leading-none italic tracking-tight"
        >Redact</span
      >
      <span
        class="font-[family-name:var(--font-display)] text-[1.75rem] leading-none italic tracking-tight transition-colors group-hover:text-[color:var(--color-rust)]"
        >ly</span
      >
      <span
        aria-hidden="true"
        class="ml-1 inline-block h-[1.1em] w-[0.45em] translate-y-[0.05em] bg-[color:var(--color-redaction)] transition-colors group-hover:bg-[color:var(--color-rust)]"
      ></span>
    </a>

    <!-- Desktop nav -->
    <ul class="hidden items-center gap-7 md:flex">
      {#each navLinks as link}
        <li>
          <a
            href={link.href}
            class="font-[family-name:var(--font-mono)] text-[0.78rem] tracking-[0.08em] uppercase text-[color:var(--color-ink-soft)] transition-colors hover:text-[color:var(--color-rust)]"
          >
            {link.label}
          </a>
        </li>
      {/each}
    </ul>

    <!-- CTA -->
    <div class="hidden md:block">
      <a
        href={APP_URL}
        class="group inline-flex items-baseline gap-2 border-b-2 border-[color:var(--color-ink)] pb-0.5 font-[family-name:var(--font-display)] text-base italic text-[color:var(--color-ink)] transition-colors hover:border-[color:var(--color-rust)] hover:text-[color:var(--color-rust)]"
      >
        zur App
        <span
          aria-hidden="true"
          class="font-[family-name:var(--font-mono)] text-sm not-italic transition-transform group-hover:translate-x-0.5"
          >→</span
        >
      </a>
    </div>

    <!-- Mobile menu button -->
    <button
      class="flex flex-col gap-1.5 p-2 md:hidden"
      onclick={() => (menuOpen = !menuOpen)}
      aria-label="Menü öffnen"
      aria-expanded={menuOpen}
    >
      <span
        class="block h-px w-6 bg-[color:var(--color-ink)] transition-transform"
        class:rotate-45={menuOpen}
        class:translate-y-2={menuOpen}
      ></span>
      <span
        class="block h-px w-6 bg-[color:var(--color-ink)] transition-opacity"
        class:opacity-0={menuOpen}
      ></span>
      <span
        class="block h-px w-6 bg-[color:var(--color-ink)] transition-transform"
        class:-rotate-45={menuOpen}
        class:-translate-y-2={menuOpen}
      ></span>
    </button>
  </nav>

  <!-- Mobile menu -->
  {#if menuOpen}
    <div
      class="border-t border-[color:var(--color-rule)] bg-[color:var(--color-paper)] px-5 pb-6 md:hidden"
    >
      <ul class="flex flex-col gap-4 pt-4">
        {#each navLinks as link}
          <li>
            <a
              href={link.href}
              class="block font-[family-name:var(--font-mono)] text-sm tracking-[0.08em] uppercase text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-rust)]"
              onclick={() => (menuOpen = false)}
            >
              {link.label}
            </a>
          </li>
        {/each}
        <li class="mt-2">
          <a
            href={APP_URL}
            class="inline-flex items-baseline gap-2 border-b-2 border-[color:var(--color-ink)] pb-0.5 font-[family-name:var(--font-display)] text-base italic text-[color:var(--color-ink)]"
          >
            zur App
            <span class="font-[family-name:var(--font-mono)] text-sm not-italic">→</span>
          </a>
        </li>
      </ul>
    </div>
  {/if}
</header>
