<script lang="ts">
  import { computeDiff, type DiffChange } from '@redactly/core/diff';

  interface Props {
    original: string;
    changes: DiffChange[];
  }
  const { original, changes }: Props = $props();

  const segments = $derived(computeDiff(original, changes));
</script>

<div
  data-testid="diff-output"
  class="flex-1 overflow-auto px-4 py-3.5 font-[family-name:var(--font-mono)] text-[13px] leading-[1.7] whitespace-pre-wrap text-[color:var(--color-ink)]"
>
  {#each segments as seg}
    {#if seg.kind === 'same'}<span>{seg.text}</span>{:else}<del class="diff-del">{seg.text}</del
      ><ins class="diff-ins">{seg.replacement}</ins>{/if}
  {/each}
</div>

<style>
  .diff-del {
    text-decoration: line-through;
    text-decoration-color: color-mix(in srgb, var(--color-danger) 70%, transparent);
    background: color-mix(in srgb, var(--color-danger) 12%, transparent);
    color: var(--color-danger);
    border-radius: 3px;
    padding: 0 2px;
  }
  .diff-ins {
    text-decoration: none;
    background: color-mix(in srgb, var(--color-ok) 15%, transparent);
    color: var(--color-ok);
    border-radius: 3px;
    padding: 0 2px;
    margin-left: 2px;
  }
</style>
