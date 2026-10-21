const TIME_ZONE = 'America/Chicago';
const CACHE_MS = 5 * 60 * 1000;
const RETRY_MS = 60 * 1000;

const dateFormatter = new Intl.DateTimeFormat('en-US', {
	timeZone: TIME_ZONE,
	weekday: 'long',
	month: 'long',
	day: 'numeric',
	year: 'numeric'
});
const timeFormatter = new Intl.DateTimeFormat('en-US', {
	timeZone: TIME_ZONE,
	hour: 'numeric',
	minute: '2-digit',
	timeZoneName: 'short'
});

function localDate(now) {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'
	}).formatToParts(now);
	const get = (type) => parts.find((part) => part.type === type).value;
	return `${get('year')}-${get('month')}-${get('day')}`;
}

// Calendar descriptions may contain HTML. Display plain text, never raw HTML.
function plainText(value = '') {
	const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
	return value
		.replace(/<br\s*\/?\s*>|<\/p>|<\/div>/gi, '\n')
		.replace(/<[^>]*>/g, '')
		.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, code) => {
			if (!code.startsWith('#')) return entities[code.toLowerCase()] ?? match;
			const number = code[1].toLowerCase() === 'x'
				? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
			return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : match;
		})
		.trim();
}

export function normalizeEvent(event) {
	if (event.status === 'cancelled') return null;
	const allDay = Boolean(event.start?.date);
	const start = allDay ? event.start.date : event.start?.dateTime;
	const end = allDay ? event.end?.date : event.end?.dateTime;
	if (!start || !end || !Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end))) {
		return null;
	}
	// Noon UTC keeps all-day dates on the same calendar day in Chicago.
	const startDate = new Date(allDay ? `${start}T12:00:00Z` : start);
	const endDate = new Date(allDay ? `${end}T12:00:00Z` : end);
	if (allDay) endDate.setUTCDate(endDate.getUTCDate() - 1); // Google's end date is exclusive.
	const date = dateFormatter.format(startDate);
	const endLabel = dateFormatter.format(endDate);
	return {
		id: event.id,
		title: event.summary || 'NHE Club event',
		start,
		end,
		allDay,
		date,
		endDate: date === endLabel ? null : endLabel,
		startTime: allDay ? null : timeFormatter.format(startDate),
		endTime: allDay ? null : timeFormatter.format(endDate),
		location: event.location || '',
		description: plainText(event.description)
	};
}

// Each warm server instance shares this cache; concurrent requests share one fetch.
// Injected fetch/clock allow offline testing without credentials or Google requests.
export function createCalendarClient({ apiKey, calendarId, fetcher = globalThis.fetch, now = Date.now }) {
	let cached = { events: [], unavailable: true };
	let expiresAt = 0;
	let pending;

	async function refresh() {
		try {
			const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
			url.search = new URLSearchParams({
				timeMin: new Date(now()).toISOString(),
				singleEvents: 'true',
				orderBy: 'startTime',
				showDeleted: 'false',
				maxResults: '10',
				timeZone: TIME_ZONE,
				fields: 'items(id,status,summary,start,end,location,description)'
			}).toString();
			// Use native server fetch, not SvelteKit's serialized load fetch.
			const response = await fetcher(url, {
				headers: { 'X-Goog-Api-Key': apiKey },
				signal: AbortSignal.timeout(8000),
				cache: 'no-store'
			});
			if (!response.ok) throw new Error('Calendar request failed');
			const body = await response.json();
			if (body.items !== undefined && !Array.isArray(body.items)) throw new Error('Invalid events');
			cached = { events: (body.items ?? []).map(normalizeEvent).filter(Boolean), unavailable: false };
			expiresAt = now() + CACHE_MS;
		} catch {
			// Do not log request URLs, headers, credentials, or Google's response body.
			// Clear old data so a deleted or moved meeting isn't advertised during an outage.
			cached = { events: [], unavailable: true };
			expiresAt = now() + RETRY_MS;
		}
	}

	return async function getEvents() {
		if (!apiKey || !calendarId) return { events: [], unavailable: true };
		if (now() >= expiresAt) {
			pending ??= refresh().finally(() => { pending = undefined; });
			await pending;
		}
		const today = localDate(now());
		return {
			...cached,
			events: cached.events.filter((event) => event.allDay ? event.end > today : Date.parse(event.end) > now())
		};
	};
}
