<script lang="ts">
  const year = new Date().getFullYear();
</script>

<footer class="border-t-2 border-[color:var(--color-signal)] bg-[color:var(--color-shell-sunken)]">
  <div class="mx-auto max-w-7xl px-5 py-16 sm:px-8">
    <div class="grid grid-cols-1 gap-12 lg:grid-cols-12">
      <!-- Wordmark + tagline -->
      <div class="lg:col-span-5">
        <a
          href="/"
          class="inline-flex items-center gap-2 font-[family-name:var(--font-mono)] text-[1.05rem] font-bold tracking-tight text-[color:var(--color-text)]"
        >
          <span class="text-[color:var(--color-signal)]">█</span>
          redactly
          <span class="text-[color:var(--color-text-mute)]">.dev</span>
        </a>
        <p
          class="mt-4 max-w-sm font-[family-name:var(--font-mono)] text-[0.85rem] leading-[1.7] text-[color:var(--color-text-dim)]"
        >
          Built carefully. No telemetry. No tracking. No server. Verifiable by anyone with DevTools.
        </p>

        <!-- Status indicators -->
        <div class="mt-6 flex flex-wrap items-center gap-4">
          <span class="status-row text-[color:var(--color-ok)]">
            <span class="status-dot"></span>
            production
          </span>
          <span class="status-row text-[color:var(--color-text-dim)]">
            <span class="h-1.5 w-1.5 bg-[color:var(--color-text-mute)]"></span>
            v0.1.0-alpha
          </span>
        </div>
      </div>

      <!-- Link columns -->
      <div class="grid grid-cols-2 gap-8 lg:col-span-7 lg:grid-cols-3">
        <div>
          <span class="label">product</span>
          <ul
            class="mt-4 space-y-2.5 font-[family-name:var(--font-mono)] text-[0.8rem] text-[color:var(--color-text-dim)]"
          >
            <li><a class="hover:text-[color:var(--color-signal)]" href="/features">features</a></li>
            <li><a class="hover:text-[color:var(--color-signal)]" href="/privacy">privacy</a></li>
            <li><a class="hover:text-[color:var(--color-signal)]" href="/faq">faq</a></li>
          </ul>
        </div>
        <div>
          <span class="label">read</span>
          <ul
            class="mt-4 space-y-2.5 font-[family-name:var(--font-mono)] text-[0.8rem] text-[color:var(--color-text-dim)]"
          >
            <li><a class="hover:text-[color:var(--color-signal)]" href="/docs">docs</a></li>
            <li><a class="hover:text-[color:var(--color-signal)]" href="/blog">log</a></li>
            <li>
              <a class="hover:text-[color:var(--color-signal)]" href="/docs/self-hosting"
                >self-host</a
              >
            </li>
          </ul>
        </div>
        <div>
          <span class="label">source</span>
          <ul
            class="mt-4 space-y-2.5 font-[family-name:var(--font-mono)] text-[0.8rem] text-[color:var(--color-text-dim)]"
          >
            <li>
              <a
                class="inline-flex items-center gap-1.5 hover:text-[color:var(--color-signal)]"
                href="https://github.com/moritz-hauff-it/redactly"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  />
                </svg>
                github
              </a>
            </li>
            <li>mit license</li>
            <li>
              <a
                class="hover:text-[color:var(--color-signal)]"
                href="https://github.com/moritz-hauff-it/redactly/blob/main/CONTRIBUTING.md"
                >contribute</a
              >
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Bottom strip -->
    <div
      class="mt-12 flex flex-col gap-4 border-t border-[color:var(--color-line)] pt-6 sm:flex-row sm:items-center sm:justify-between"
    >
      <span
        class="font-[family-name:var(--font-mono)] text-[0.65rem] tracking-[0.1em] uppercase text-[color:var(--color-text-mute)]"
      >
        © {year} redactly contributors
      </span>
      <span
        class="font-[family-name:var(--font-mono)] text-[0.65rem] tracking-[0.1em] uppercase text-[color:var(--color-text-mute)]"
      >
        this page ships zero trackers · verify with devtools
      </span>
    </div>
  </div>
</footer>
