interface Env {
	BETTER_STACK_SOURCE_TOKEN: string;
	BETTER_STACK_INGESTING_URL: string;
}

interface TailEvent {
	event: {
		request?: { url: string; method: string; headers: Record<string, string> };
		response?: { status: number };
	} | null;
	eventTimestamp: number;
	logs: Array<{ message: unknown[]; level: string; timestamp: number }>;
	exceptions: Array<{ name: string; message: string; timestamp: number }>;
	outcome: string;
	scriptName: string;
}

export default {
	async tail(events: TailEvent[], env: Env): Promise<void> {
		const entries = events.flatMap((event) => {
			const base = {
				script: event.scriptName,
				outcome: event.outcome,
				url: event.event?.request?.url,
				method: event.event?.request?.method,
				status: event.event?.response?.status,
			};

			const logs = event.logs.map((log) => ({
				dt: new Date(log.timestamp).toISOString(),
				level: log.level,
				message: log.message.map(String).join(" "),
				...base,
			}));

			const exceptions = event.exceptions.map((exception) => ({
				dt: new Date(exception.timestamp).toISOString(),
				level: "error",
				message: `${exception.name}: ${exception.message}`,
				...base,
			}));

			return [...logs, ...exceptions];
		});

		if (entries.length === 0) return;

		const response = await fetch(env.BETTER_STACK_INGESTING_URL, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${env.BETTER_STACK_SOURCE_TOKEN}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(entries),
		});

		if (!response.ok) {
			throw new Error(`Better Stack rejected ${entries.length} entries with ${response.status}`);
		}
	},
};
