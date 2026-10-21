import { GOOGLE_CALENDAR_API_KEY, GOOGLE_CALENDAR_ID } from '$app/env/private';
import { createCalendarClient } from '#lib/server/calendar.js';

export const prerender = false;

const getEvents = createCalendarClient({
	apiKey: GOOGLE_CALENDAR_API_KEY,
	calendarId: GOOGLE_CALENDAR_ID
});

export async function load({ depends, setHeaders }) {
	depends('club:calendar');
	// Fresh page data comes through the server cache, never a stale CDN response.
	setHeaders({ 'cache-control': 'no-store' });
	const { events, unavailable } = await getEvents();
	return { nextEvent: events[0] ?? null, calendarUnavailable: unavailable };
}
