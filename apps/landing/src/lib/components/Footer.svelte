<script lang="ts">
  const year = new Date().getFullYear();
</script>

<footer class="mt-24 border-t-2 border-[color:var(--color-ink)]">
  <div class="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
    <div class="grid grid-cols-1 gap-12 lg:grid-cols-12">
      <!-- Wordmark + tagline -->
      <div class="lg:col-span-5">
        <a href="/" class="flex items-baseline gap-1 text-[color:var(--color-ink)]">
          <span
            class="font-[family-name:var(--font-display)] text-[1.75rem] leading-none italic tracking-tight"
            >Redactly</span
          >
          <span
            aria-hidden="true"
            class="ml-1 inline-block h-[1.1em] w-[0.45em] translate-y-[0.05em] bg-[color:var(--color-redaction)]"
          ></span>
        </a>
        <p
          class="mt-4 max-w-sm font-[family-name:var(--font-display)] text-lg leading-snug italic text-[color:var(--color-ink-soft)]"
        >
          Mit Sorgfalt gebaut. Ohne Telemetrie. Ohne Tracking. Ohne Server.
        </p>
      </div>

      <!-- Columns -->
      <div class="grid grid-cols-2 gap-8 lg:col-span-7 lg:grid-cols-3">
        <div>
          <span class="label-caps">Produkt</span>
          <ul class="mt-4 space-y-2.5 text-sm text-[color:var(--color-ink-soft)]">
            <li><a class="hover:text-[color:var(--color-rust)]" href="/features">Funktionen</a></li>
            <li><a class="hover:text-[color:var(--color-rust)]" href="/privacy">Datenschutz</a></li>
            <li><a class="hover:text-[color:var(--color-rust)]" href="/faq">FAQ</a></li>
          </ul>
        </div>
        <div>
          <span class="label-caps">Lesen</span>
          <ul class="mt-4 space-y-2.5 text-sm text-[color:var(--color-ink-soft)]">
            <li>
              <a class="hover:text-[color:var(--color-rust)]" href="/docs">Dokumentation</a>
            </li>
            <li><a class="hover:text-[color:var(--color-rust)]" href="/blog">Journal</a></li>
            <li>
              <a class="hover:text-[color:var(--color-rust)]" href="/docs/self-hosting"
                >Selbst hosten</a
              >
            </li>
          </ul>
        </div>
        <div>
          <span class="label-caps">Quelle</span>
          <ul class="mt-4 space-y-2.5 text-sm text-[color:var(--color-ink-soft)]">
            <li>
              <a
                class="inline-flex items-center gap-1.5 hover:text-[color:var(--color-rust)]"
                href="https://github.com/moritz-hauff-it/redactly"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  />
                </svg>
                GitHub
              </a>
            </li>
            <li>MIT-Lizenz</li>
            <li>
              <a
                class="hover:text-[color:var(--color-rust)]"
                href="https://github.com/moritz-hauff-it/redactly/blob/main/CONTRIBUTING.md"
                >Mitwirken</a
              >
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Bottom strip -->
    <div
      class="mt-12 flex flex-col gap-4 border-t border-[color:var(--color-rule)] pt-6 text-xs sm:flex-row sm:items-center sm:justify-between"
    >
      <span class="marginalia">© {year} Redactly contributors</span>
      <span class="marginalia text-[color:var(--color-ink-mute)]"
        >Diese Seite hat null Tracker. Du kannst nachschauen.</span
      >
    </div>
  </div>
</footer>
