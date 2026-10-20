<script>
	let { href, children, type = 'button', ...attributes } = $props();
</script>

{#if href}
	<a class="button" {href} {...attributes}>{@render children()}</a>
{:else}
	<button class="button" {type} {...attributes}>{@render children()}</button>
{/if}
