<script lang="ts">
  import { APP_URL } from '$lib/env';

  interface Props {
    href?: string;
    size?: 'sm' | 'md' | 'lg';
    label?: string;
  }

  let { href = APP_URL, size = 'md', label = 'App starten' }: Props = $props();

  const sizeClasses = {
    sm: 'px-5 py-2.5 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };
</script>

<a
  {href}
  class="group relative inline-flex items-baseline gap-3 bg-[color:var(--color-ink)] font-[family-name:var(--font-display)] italic text-[color:var(--color-paper)] shadow-[3px_3px_0_0_var(--color-rust)] transition-all hover:bg-[color:var(--color-rust)] hover:shadow-[3px_3px_0_0_var(--color-ink)] {sizeClasses[
    size
  ]}"
>
  <span class="not-italic font-[family-name:var(--font-mono)] text-xs tracking-[0.12em] uppercase"
    >→</span
  >
  {label}
</a>
