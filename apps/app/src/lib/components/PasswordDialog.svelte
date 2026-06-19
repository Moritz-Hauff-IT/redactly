<script lang="ts">
  import { t } from '$lib/i18n/locale.svelte.js';

  interface Props {
    open: boolean;
    title: string;
    body: string;
    /** Show a second "repeat password" field and require a match (export). */
    confirm?: boolean;
    /** External error to show (e.g. wrong password on decrypt). */
    error?: string | null;
    onsubmit: (password: string) => void;
    oncancel: () => void;
  }
  let { open, title, body, confirm = false, error = null, onsubmit, oncancel }: Props = $props();

  let pw = $state('');
  let pw2 = $state('');
  let localError = $state<string | null>(null);

  // Reset fields whenever the dialog (re)opens.
  $effect(() => {
    if (open) {
      pw = '';
      pw2 = '';
      localError = null;
    }
  });

  function submit() {
    if (!pw) return;
    if (confirm && pw !== pw2) {
      localError = t('pw_mismatch');
      return;
    }
    onsubmit(pw);
  }

  function onKeydown(e: KeyboardEvent) {
    if (!open) return;
    if (e.key === 'Escape') oncancel();
    else if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
  <button class="pw-backdrop" aria-label={t('pw_cancel')} onclick={oncancel}></button>
  <div class="pw-dialog" role="dialog" aria-modal="true" aria-labelledby="pw-title">
    <h2
      id="pw-title"
      class="font-[family-name:var(--font-serif)] text-[17px] leading-none font-medium text-[color:var(--color-ink)]"
    >
      {title}
    </h2>
    <p class="mt-2 text-[12.5px] leading-snug text-[color:var(--color-ink-soft)]">{body}</p>

    <!-- svelte-ignore a11y_autofocus -->
    <input
      type="password"
      class="pw-input mt-4"
      placeholder={t('pw_placeholder')}
      autocomplete="off"
      autofocus
      bind:value={pw}
    />
    {#if confirm}
      <input
        type="password"
        class="pw-input mt-2"
        placeholder={t('pw_confirm_placeholder')}
        autocomplete="off"
        bind:value={pw2}
      />
    {/if}

    {#if localError || error}
      <p class="mt-2 text-[11.5px] text-[color:var(--color-danger)]">{localError ?? error}</p>
    {/if}

    <div class="mt-5 flex justify-end gap-2">
      <button class="btn-ghost" onclick={oncancel}>{t('pw_cancel')}</button>
      <button class="btn-primary" disabled={!pw} onclick={submit}>{t('pw_submit')}</button>
    </div>
  </div>
{/if}

<style>
  .pw-backdrop {
    position: fixed;
    inset: 0;
    z-index: 60;
    border: none;
    cursor: pointer;
    background: color-mix(in srgb, var(--color-bg) 70%, transparent);
    backdrop-filter: blur(2px);
  }
  .pw-dialog {
    position: fixed;
    z-index: 61;
    top: 50%;
    left: 50%;
    width: min(420px, calc(100vw - 2rem));
    transform: translate(-50%, -50%);
    padding: 24px;
    border: 1px solid var(--color-rule-strong);
    border-radius: 12px;
    background: var(--color-bg-elev);
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
  }
  .pw-input {
    width: 100%;
    border-radius: 8px;
    border: 1px solid var(--color-rule);
    background: var(--color-bg);
    padding: 9px 12px;
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--color-ink);
  }
  .pw-input::placeholder {
    color: var(--color-ink-mute);
  }
  .pw-input:focus {
    outline: none;
    border-color: var(--color-accent);
  }
</style>
