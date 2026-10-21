import { normalizeEvent } from '../src/lib/server/calendar.js';

async function main() {
	const apiKey = process.env.GOOGLE_CALENDAR_API_KEY?.trim();
	const calendarId = process.env.GOOGLE_CALENDAR_ID?.trim();
	if (!apiKey || !calendarId) {
		throw new Error('Set GOOGLE_CALENDAR_API_KEY and GOOGLE_CALENDAR_ID in .env first.');
	}
	const start = new Date();
	const end = new Date(start);
	end.setUTCFullYear(end.getUTCFullYear() + 1);
	// Optional exclusive end date: npm run calendar:list -- 2028-01-01
	if (process.argv[2]) end.setTime(Date.parse(process.argv[2]));
	if (!Number.isFinite(end.getTime()) || end <= start) {
		throw new Error('Provide an end date in the future, such as 2028-01-01.');
	}

	const events = [];
	let pageToken;
	do {
		const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
		url.search = new URLSearchParams({
			timeMin: start.toISOString(), timeMax: end.toISOString(),
			singleEvents: 'true', orderBy: 'startTime', showDeleted: 'false',
			maxResults: '2500', timeZone: 'America/Chicago',
			fields: 'nextPageToken,items(id,status,summary,start,end,location,description)',
			...(pageToken ? { pageToken } : {})
		}).toString();
		let response;
		try {
			response = await fetch(url, {
				headers: { 'X-Goog-Api-Key': apiKey },
				signal: AbortSignal.timeout(15000)
			});
		} catch {
			throw new Error('Could not reach Google Calendar. Check your network connection and try again.');
		}
		if (!response.ok) {
			throw new Error(`Google Calendar returned HTTP ${response.status}. Check the API key, API restrictions, Calendar ID, and public sharing settings.`);
		}
		const body = await response.json();
		if (body.items !== undefined && !Array.isArray(body.items)) {
			throw new Error('Google Calendar returned an invalid event list.');
		}
		events.push(...(body.items ?? []).map(normalizeEvent).filter(Boolean));
		pageToken = body.nextPageToken;
	} while (pageToken);

	console.log(`Events from ${start.toISOString()} until ${end.toISOString()} (exclusive)`);
	console.log('Times shown in America/Chicago. Includes events currently in progress.\n');
	if (!events.length) console.log('No upcoming events found in this date range.');
	for (const [index, event] of events.entries()) {
		console.log(`${index + 1}. ${event.title}`);
		console.log(`   ${event.date}${event.endDate ? ` – ${event.endDate}` : ''}`);
		console.log(`   ${event.allDay ? 'All day' : `${event.startTime} to ${event.endTime}`}`);
		console.log(`   Location: ${event.location || '(not specified)'}`);
		console.log(`   Description: ${event.description || '(not specified)'}`);
		console.log();
	}
	console.log(`${events.length} event(s) found.`);
}

main().catch((error) => {
	// Never print request headers, URLs, or raw API responses.
	console.error(error instanceof SyntaxError ? 'Google Calendar returned invalid JSON.' : error.message);
	process.exitCode = 1;
});
