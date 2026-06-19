<script lang="ts">
  import { onMount } from 'svelte';
  import { settingsStore } from '$lib/stores/settingsStore.svelte.js';
  import { t } from '$lib/i18n/locale.svelte.js';

  interface Props {
    /** Opens the settings drawer (owned by the layout). */
    onOpenSettings: () => void;
  }
  const { onOpenSettings }: Props = $props();

  // Persisted dismissal — read in onMount (client-only) to stay safe under
  // static prerendering. `mounted` also avoids an SSR/hydration flicker.
  const LS_KEY = 'redactly:onboarding-engines-dismissed';
  let dismissed = $state(true);
  let mounted = $state(false);

  onMount(() => {
    mounted = true;
    try {
      dismissed = localStorage.getItem(LS_KEY) === '1';
    } catch {
      dismissed = false;
    }
  });

  function dismiss(): void {
    dismissed = true;
    try {
      localStorage.setItem(LS_KEY, '1');
    } catch {
      // best-effort
    }
  }

  function openSettings(): void {
    // Opening settings to act on the hint is itself an acknowledgement.
    dismiss();
    onOpenSettings();
  }

  // Once the user has turned on either engine the hint is moot — hide it
  // (without needing an explicit dismiss) so it never lingers as noise.
  const enginesOff = $derived(!settingsStore.nerEnabled && !settingsStore.webllmEnabled);
  const visible = $derived(mounted && !dismissed && enginesOff);
</script>

{#if visible}
  <div class="onboard" role="note">
    <svg
      class="onboard-icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2a7 7 0 0 0-4 12.7V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.3A7 7 0 0 0 12 2z" />
      <line x1="9" y1="21" x2="15" y2="21" />
    </svg>
    <div class="onboard-text">
      <strong>{t('onb_lead')}</strong>
      <span>{t('onb_body')}</span>
    </div>
    <div class="onboard-actions">
      <button class="onboard-cta" onclick={openSettings} type="button">{t('onb_open')}</button>
      <button class="onboard-skip" onclick={dismiss} type="button">{t('onb_dismiss')}</button>
    </div>
  </div>
{/if}

<style>
  .onboard {
    display: flex;
    align-items: flex-start;
    gap: 11px;
    margin-bottom: 20px;
    padding: 11px 14px;
    border: 1px solid var(--color-accent);
    border-left: 3px solid var(--color-accent);
    border-radius: var(--r-md);
    background: var(--color-accent-soft);
  }
  .onboard-icon {
    flex-shrink: 0;
    margin-top: 1px;
    color: var(--color-accent);
  }
  .onboard-text {
    flex: 1;
    font-size: 12.5px;
    line-height: 1.5;
    color: var(--color-ink-soft);
  }
  .onboard-text strong {
    margin-right: 6px;
    font-weight: 600;
    color: var(--color-ink);
  }
  .onboard-actions {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    align-self: center;
  }
  .onboard-cta {
    white-space: nowrap;
    padding: 6px 12px;
    border: 0;
    border-radius: var(--r-sm);
    background: var(--color-accent);
    color: #fff;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: filter 0.14s;
  }
  .onboard-cta:hover {
    filter: brightness(1.08);
  }
  .onboard-skip {
    white-space: nowrap;
    padding: 6px 8px;
    border: 0;
    background: transparent;
    color: var(--color-ink-mute);
    font-size: 12px;
    cursor: pointer;
    transition: color 0.14s;
  }
  .onboard-skip:hover {
    color: var(--color-ink);
  }
</style>
