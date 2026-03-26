<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ClassValue } from 'svelte/elements';
  import { twMerge } from 'tailwind-merge';
  import { clsx } from 'clsx';

  var {
    children,
    class: className = '',
    element = $bindable(),
    ...rest
  }: {
    children: Snippet;
    class?: ClassValue;
    element?: HTMLButtonElement;
    [key: string]: any;
  } = $props();
</script>

<button
  bind:this={element}
  class={twMerge(
    'cursor-pointer rounded-sm border border-gray-400 bg-gray-300 p-3 text-gray-600',
    'active:bg-gray-400/80',
    'hover:border-gray-500 hover:bg-gray-400',
    'disabled:text-gray-400 disabled:hover:border-gray-400 disabled:hover:bg-gray-300',
    clsx(className)
  )}
  {...rest}
>
  {@render children()}
</button>
