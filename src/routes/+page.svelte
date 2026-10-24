<script>
	import logo from '#lib/assets/icon-192.png';
	import Button from '#lib/Button.svelte';
	import Contact from '#lib/Contact.svelte';
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';

	let { data } = $props();

	onMount(() => {
		// Re-run the server load for visitors who leave this page open.
		let refreshing = false;
		async function refreshCalendar() {
			if (document.hidden || refreshing) return;
			refreshing = true;
			try {
				await invalidate('club:calendar');
			} catch {
				// A disconnected browser retries on the next interval or tab focus.
			} finally {
				refreshing = false;
			}
		}
		const timer = setInterval(refreshCalendar, 5 * 60 * 1000);
		document.addEventListener('visibilitychange', refreshCalendar);
		return () => {
			clearInterval(timer);
			document.removeEventListener('visibilitychange', refreshCalendar);
		};
	});
</script>

<svelte:head>
	<title>NHE Club</title>
	<meta
		name="description"
		content="A discussion club at Austin Community College's Hays Campus for students curious about the brain, health, and ethics. All majors welcome. No dues or science background needed."
	/>
</svelte:head>

<div class="page" id="top">
	<a class="skip-link" href="#main">Skip to content</a>
	<header>
		<img class="header-logo" src={logo} alt="" width="64" height="64" />
		<div>
			<a class="wordmark" href="#top" aria-label="NHE Club home">NHE <span class="club">CLUB</span></a>
			<p>Austin Community College</p>
		</div>
	</header>

	<main id="main">
		<div class="main-column">
			<p class="eyebrow">Curiosity is the only prerequisite</p>
			<h1>Neuroscience, Health <span class="ampersand">&</span><br />Ethics Club</h1>
			<p>A discussion club for students of every major who are curious about the brain, health, and the ethical questions that come with modern medicine and science.</p>
			<p>Open to any student enrolled in at least one ACC course. No dues. No science background needed.</p>

			<Button href="https://austincc.campuslabs.com/engage/organization/nhe" target="_blank">Sign up here!</Button>
		</div>

		<div class="secondary-column">
			<aside class="upcoming-event" aria-labelledby="event-heading">
				<p class="eyebrow" id="event-heading">Upcoming event</p>
				{#if data.nextEvent}
					<h2>{data.nextEvent.title}</h2>
					<p class="event-date">
						<time datetime={data.nextEvent.start}>{data.nextEvent.date}</time>
						{#if data.nextEvent.endDate} – {data.nextEvent.endDate}{/if}
					</p>
					{#if data.nextEvent.allDay}
						<p>All day</p>
					{:else}
						<p><time datetime={data.nextEvent.start}>{data.nextEvent.startTime}</time> to <time datetime={data.nextEvent.end}>{data.nextEvent.endTime}</time></p>
					{/if}
					{#if data.nextEvent.location}<p>{data.nextEvent.location}</p>{/if}
					{#if data.nextEvent.description}
						<p>{#each data.nextEvent.description.split('\n') as line, index}{#if index > 0}<br />{/if}{line}{/each}</p>
					{/if}
				{:else if data.calendarUnavailable}
					<p>We couldn't load the calendar right now. Please check back soon.</p>
				{:else}
					<p>No upcoming events are scheduled. Check back soon for our next meeting.</p>
				{/if}
			</aside>

			<p class="schedule-note">We're tentatively planning to meet every other week during fall and spring, in person at Hays. Future dates, rooms, and a possible virtual option are still to be decided.</p>

			<section class="contacts" aria-labelledby="contact-heading">
				<h2 id="contact-heading">Contact us</h2>
				<Contact name="Christopher Dunn" title="President" email="chirstopher.dunn@g.austincc.edu" />
				<Contact name="Sarah Powell" title="Vice President" email="sarah.powell2@g.austincc.edu" />
				<Contact name="Vincent Morales" title="Secretary" email="vincent.morales2@g.austincc.edu" />
			</section>
		</div>
	</main>

	<footer>
		<p class="footer-name">NHE Club</p>
		<p>Neuroscience, Health & Ethics Club<br />Austin Community College · Hays Campus</p>
	</footer>
</div>
