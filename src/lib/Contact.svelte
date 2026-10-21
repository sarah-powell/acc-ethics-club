<script>
	let { name, title, email } = $props();
</script>

<address class="contact">
	<div class="contact-details">
		<strong>{name}</strong>
		<span class="contact-title">{title}</span>
	</div>
	<a href={`mailto:${email}`}>{email}</a>
</address>
