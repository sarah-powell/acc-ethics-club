import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCalendarClient } from './calendar.js';

const initialTime = Date.parse('2026-10-20T15:00:00Z');
const event = (overrides = {}) => ({
	id: 'meeting', summary: 'Club discussion',
	start: { dateTime: '2026-10-22T11:00:00-05:00' },
	end: { dateTime: '2026-10-22T12:00:00-05:00' },
	location: 'Hays library', description: '<p>Brains &amp; ethics</p><p>All welcome.</p>',
	...overrides
});
const response = (items) => Response.json({ items });

test('requests ordered upcoming recurring instances with a private header and formats Chicago times', async () => {
	const getEvents = createCalendarClient({
		apiKey: 'test-key', calendarId: 'test/calendar@example.invalid', now: () => initialTime,
		fetcher: async (url, options) => {
			assert.match(url.pathname, /test%2Fcalendar%40example.invalid/);
			assert.equal(url.searchParams.get('timeMin'), new Date(initialTime).toISOString());
			assert.equal(url.searchParams.get('singleEvents'), 'true');
			assert.equal(url.searchParams.get('orderBy'), 'startTime');
			assert.equal(url.searchParams.get('showDeleted'), 'false');
			assert.equal(url.searchParams.get('timeZone'), 'America/Chicago');
			assert.equal(url.searchParams.has('key'), false);
			assert.equal(options.headers['X-Goog-Api-Key'], 'test-key');
			return response([event()]);
		}
	});
	const result = await getEvents();
	assert.equal(result.unavailable, false);
	assert.equal(result.events[0].date, 'Thursday, October 22, 2026');
	assert.equal(result.events[0].startTime, '11:00 AM CDT');
	assert.equal(result.events[0].endTime, '12:00 PM CDT');
	assert.equal(result.events[0].location, 'Hays library');
	assert.equal(result.events[0].description, 'Brains & ethics\nAll welcome.');
	assert.equal(JSON.stringify(result).includes('test-key'), false);
});

test('shares concurrent requests, caches for five minutes, then reflects edits and deletions', async () => {
	let time = initialTime;
	let calls = 0;
	const getEvents = createCalendarClient({
		apiKey: 'key', calendarId: 'id', now: () => time,
		fetcher: async () => {
			calls++;
			return response(calls === 3 ? [] : [event({ summary: calls === 1 ? 'Original' : 'Edited' })]);
		}
	});
	await Promise.all([getEvents(), getEvents(), getEvents()]);
	assert.equal(calls, 1);
	time += 299999;
	assert.equal((await getEvents()).events[0].title, 'Original');
	assert.equal(calls, 1);
	time++;
	assert.equal((await getEvents()).events[0].title, 'Edited');
	time += 300000;
	assert.deepEqual((await getEvents()).events, []);
});

test('distinguishes empty calendars, missing configuration, and API/network/JSON failures', async () => {
	const empty = createCalendarClient({ apiKey: 'key', calendarId: 'id', fetcher: async () => Response.json({}) });
	assert.deepEqual(await empty(), { events: [], unavailable: false });
	const missing = createCalendarClient({ apiKey: '', calendarId: '', fetcher: () => assert.fail('Unexpected request') });
	assert.equal((await missing()).unavailable, true);
	for (const fetcher of [
		async () => new Response('', { status: 403 }),
		async () => { throw new Error('Offline'); },
		async () => new Response('not json'),
		async () => Response.json({ items: {} })
	]) {
		const getEvents = createCalendarClient({ apiKey: 'key', calendarId: 'id', fetcher });
		assert.deepEqual(await getEvents(), { events: [], unavailable: true });
	}
});

test('backs off failures for one minute and recovers without a restart', async () => {
	let time = initialTime;
	let calls = 0;
	const getEvents = createCalendarClient({
		apiKey: 'key', calendarId: 'id', now: () => time,
		fetcher: async () => ++calls === 1 ? new Response('', { status: 429 }) : response([event()])
	});
	assert.equal((await getEvents()).unavailable, true);
	time += 59999;
	assert.equal((await getEvents()).unavailable, true);
	assert.equal(calls, 1);
	time++;
	assert.equal((await getEvents()).events.length, 1);
});

test('drops cancelled/malformed/ended events and expires events even inside the cache window', async () => {
	let time = initialTime;
	const getEvents = createCalendarClient({
		apiKey: 'key', calendarId: 'id', now: () => time,
		fetcher: async () => response([
			event({ status: 'cancelled' }), event({ start: {} }),
			event({ end: { dateTime: new Date(initialTime - 1).toISOString() } }),
			event({ end: { dateTime: new Date(initialTime + 60000).toISOString() } }),
			event({ id: 'later' })
		])
	});
	assert.equal((await getEvents()).events.length, 2);
	time += 60000;
	assert.equal((await getEvents()).events[0].id, 'later');
});

test('handles all-day exclusive ends, multiple days, and Chicago daylight saving time', async () => {
	const getEvents = createCalendarClient({
		apiKey: 'key', calendarId: 'id', now: () => initialTime,
		fetcher: async () => response([
			event({ start: { date: '2026-10-20' }, end: { date: '2026-10-21' } }),
			event({ start: { date: '2026-10-22' }, end: { date: '2026-10-25' } }),
			event({ start: { dateTime: '2026-12-10T17:00:00Z' }, end: { dateTime: '2026-12-10T18:00:00Z' } })
		])
	});
	const { events } = await getEvents();
	assert.equal(events[0].date, 'Tuesday, October 20, 2026');
	assert.equal(events[0].endDate, null);
	assert.equal(events[0].allDay, true);
	assert.equal(events[0].startTime, null);
	assert.equal(events[1].endDate, 'Saturday, October 24, 2026');
	assert.equal(events[2].startTime, '11:00 AM CST');
});
