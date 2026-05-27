<script lang="ts">
  import { APP_URL } from '$lib/env';

  let menuOpen = $state(false);

  const navLinks = [
    { href: '/features', label: 'Features' },
    { href: '/docs', label: 'Docs' },
    { href: '/privacy', label: 'Privacy' },
    { href: '/faq', label: 'FAQ' },
    { href: '/blog', label: 'Blog' },
  ];
</script>

<header class="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
  <nav class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
    <!-- Logo -->
    <a href="/" class="flex items-center gap-2 font-mono text-xl font-bold text-teal-600">
      de-pii
      <span class="rounded bg-teal-50 px-1.5 py-0.5 text-xs font-normal text-teal-700">beta</span>
    </a>

    <!-- Desktop nav -->
    <ul class="hidden items-center gap-6 md:flex">
      {#each navLinks as link}
        <li>
          <a
            href={link.href}
            class="text-sm font-medium text-slate-600 transition-colors hover:text-teal-600"
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
        class="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
      >
        Zur App
        <span aria-hidden="true">→</span>
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
        class="block h-0.5 w-5 bg-slate-700 transition-transform"
        class:rotate-45={menuOpen}
        class:translate-y-2={menuOpen}
      ></span>
      <span class="block h-0.5 w-5 bg-slate-700 transition-opacity" class:opacity-0={menuOpen}
      ></span>
      <span
        class="block h-0.5 w-5 bg-slate-700 transition-transform"
        class:-rotate-45={menuOpen}
        class:-translate-y-2={menuOpen}
      ></span>
    </button>
  </nav>

  <!-- Mobile menu -->
  {#if menuOpen}
    <div class="border-t border-slate-100 bg-white px-4 pb-4 md:hidden">
      <ul class="flex flex-col gap-3 pt-3">
        {#each navLinks as link}
          <li>
            <a
              href={link.href}
              class="block text-sm font-medium text-slate-700 hover:text-teal-600"
              onclick={() => (menuOpen = false)}
            >
              {link.label}
            </a>
          </li>
        {/each}
        <li>
          <a
            href={APP_URL}
            class="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Zur App →
          </a>
        </li>
      </ul>
    </div>
  {/if}
</header>
