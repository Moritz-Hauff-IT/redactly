<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '$lib/i18n/locale.svelte.js';

  // Persisted so a user who has read it isn't nagged on every visit. Shown
  // by default; only an explicit dismiss hides it. localStorage is read in
  // onMount (client-only) to stay safe under static prerendering.
  const LS_KEY = 'redactly:caution-dismissed';
  let dismissed = $state(false);

  onMount(() => {
    try {
      dismissed = localStorage.getItem(LS_KEY) === '1';
    } catch {
      // private mode / blocked storage → keep showing the reminder
    }
  });

  function dismiss(): void {
    dismissed = true;
    try {
      localStorage.setItem(LS_KEY, '1');
    } catch {
      // best-effort persistence
    }
  }
</script>

{#if !dismissed}
  <div class="caution" role="note">
    <svg
      class="caution-icon"
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path
        d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
      />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
    <p class="caution-text">
      <strong>{t('caution_lead')}</strong>
      {t('caution_body')}
    </p>
    <button
      class="caution-dismiss"
      onclick={dismiss}
      aria-label={t('caution_dismiss')}
      type="button"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  </div>
{/if}
