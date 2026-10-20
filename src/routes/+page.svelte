<script>
	import Button from '#lib/Button.svelte';
</script>

<svelte:head>
	<title>NHE Club | ACC Hays Campus</title>
	<meta
		name="description"
		content="A discussion club at Austin Community College's Hays Campus for students curious about the brain, health, and ethics. All majors welcome. No dues or science background needed."
	/>
</svelte:head>

<div class="page" id="top">
	<a class="skip-link" href="#main">Skip to content</a>
	<header>
		<a class="wordmark" href="#top" aria-label="NHE Club home">NHE<span class="wordmark-dot">.</span> <span class="club">CLUB</span></a>
		<p>Austin Community College · Hays Campus</p>
	</header>

	<main id="main">
		<p class="eyebrow">Curiosity is the only prerequisite.</p>
		<h1>Neuroscience,<br />Health <span class="ampersand">&</span><br />Ethics Club</h1>
		<p>A discussion club for students of every major who are curious about the brain, health, and the ethical questions that come with modern medicine and science.</p>
		<p>Open to any student enrolled in at least one ACC course. No dues. No science background needed.</p>

		<Button href="#join">Sign up here!</Button>
		<p id="join" class="signup-note" tabindex="-1">Our online signup link is coming soon. In the meantime, you're welcome at our first meeting.</p>

		<aside class="upcoming-event" aria-labelledby="event-heading">
			<p class="eyebrow">Upcoming event</p>
			<p class="event-date"><time datetime="2026-10-22">Thursday, October 22, 2026</time></p>
			<p>11:00 a.m. to 12:00 p.m.<br />Hays Campus library (meeting room next to outdoor patio)</p>
		</aside>

		<p class="schedule-note">We're tentatively planning to meet every other week during fall and spring, in person at Hays. Future dates, rooms, and a possible virtual option are still to be decided.</p>
	</main>

	<footer>
		<p class="footer-name">NHE Club</p>
		<p>Neuroscience, Health & Ethics Club<br />Austin Community College · Hays Campus</p>
		<a href="#top">Back to top ↑</a>
	</footer>
</div>
