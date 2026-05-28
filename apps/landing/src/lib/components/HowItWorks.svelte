<script lang="ts">
  import CtaButton from './CtaButton.svelte';

  const steps = [
    {
      n: '01',
      cmd: 'paste.input',
      title: 'You paste what is sensitive.',
      body: 'Email draft, code snippet, log dump, a PDF with contract text. Redactly reads along — but only in your browser tab. Auto-detects what looks like a person, email, IBAN, token, or secret.',
      stat: 'execute: local',
    },
    {
      n: '02',
      cmd: 'mask.send',
      title: 'You take the redacted copy to the LLM.',
      body: '"Martin Müller" becomes [PERSON_1]. Your AWS key becomes [SECRET_3]. You paste the masked text into ChatGPT or Claude. The model sees placeholders — and only placeholders.',
      stat: 'llm sees: tokens only',
    },
    {
      n: '03',
      cmd: 'restore.local',
      title: 'The response comes back — and gets readable again.',
      body: "You paste the LLM's reply into Redactly. Placeholders are swapped for your real values, because the mapping was created locally during masking and has never left this tab.",
      stat: 'restore: clientside',
    },
  ];
</script>

<section
  class="border-b border-[color:var(--color-line)] bg-[color:var(--color-shell-sunken)] py-24 sm:py-32"
>
  <div class="mx-auto max-w-7xl px-5 sm:px-8">
    <!-- Section header -->
    <header
      class="mb-16 flex flex-wrap items-end justify-between gap-6 border-b border-[color:var(--color-line-strong)] pb-4"
    >
      <div>
        <span class="label label-signal">03 / pipeline</span>
        <h2 class="display mt-3 text-[2.5rem] text-[color:var(--color-text)] sm:text-[3.5rem]">
          Three operations.<br />
          <span class="text-[color:var(--color-text-dim)]">All client-resident.</span>
        </h2>
      </div>
      <div
        class="font-[family-name:var(--font-mono)] text-[0.75rem] text-[color:var(--color-text-mute)]"
      >
        flow: input → mask → restore
      </div>
    </header>

    <!-- Steps as terminal-style cards -->
    <ol class="space-y-px bg-[color:var(--color-line)]">
      {#each steps as step}
        <li
          class="group bg-[color:var(--color-shell)] transition-colors hover:bg-[color:var(--color-shell-raised)]"
        >
          <div class="grid grid-cols-1 gap-x-8 gap-y-4 px-6 py-8 sm:px-10 sm:py-10 lg:grid-cols-12">
            <!-- Number + command -->
            <div class="lg:col-span-3">
              <div
                class="display text-[3.5rem] leading-none text-[color:var(--color-signal)] sm:text-[5rem]"
              >
                {step.n}
              </div>
              <div
                class="mt-3 font-[family-name:var(--font-mono)] text-[0.75rem] tracking-[0.08em] text-[color:var(--color-text-mute)]"
              >
                <span class="text-[color:var(--color-signal)]">$</span>
                {step.cmd}
              </div>
            </div>

            <!-- Body -->
            <div class="lg:col-span-7">
              <h3
                class="display text-[1.625rem] leading-tight text-[color:var(--color-text)] sm:text-[1.875rem]"
              >
                {step.title}
              </h3>
              <p
                class="mt-4 max-w-3xl font-[family-name:var(--font-mono)] text-[0.9rem] leading-[1.7] text-[color:var(--color-text-dim)]"
              >
                {step.body}
              </p>
            </div>

            <!-- Stat badge -->
            <div class="flex items-start lg:col-span-2 lg:justify-end">
              <span
                class="inline-flex items-center gap-2 border border-[color:var(--color-line-strong)] bg-[color:var(--color-shell-sunken)] px-3 py-1.5 font-[family-name:var(--font-mono)] text-[0.65rem] tracking-[0.08em] uppercase text-[color:var(--color-ok)]"
              >
                <span class="h-1.5 w-1.5 bg-[color:var(--color-ok)]"></span>
                {step.stat}
              </span>
            </div>
          </div>
        </li>
      {/each}
    </ol>

    <div class="mt-20 flex flex-col items-center gap-4 text-center">
      <span class="label">ready to test?</span>
      <CtaButton size="lg" />
    </div>
  </div>
</section>
