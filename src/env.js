import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	GOOGLE_CALENDAR_API_KEY: {
		public: false,
		static: false,
		schema: (value) => value?.trim() ?? ''
	},
	GOOGLE_CALENDAR_ID: {
		public: false,
		static: false,
		schema: (value) => value?.trim() ?? ''
	}
});
