type LogLevel = "info" | "warn" | "error" | "debug";

interface LogMeta {
	[key: string]: unknown;
}

function log(level: LogLevel, message: string, meta?: LogMeta) {
	const entry: Record<string, unknown> = {
		level,
		time: new Date().toISOString(),
		message,
	};
	if (meta && Object.keys(meta).length > 0) {
		entry.meta = meta;
	}
	// Simple structured JSON log
	// eslint-disable-next-line no-console
	console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](
		JSON.stringify(entry)
	);
}

export const logger = {
	info: (message: string, meta?: LogMeta) => log("info", message, meta),
	warn: (message: string, meta?: LogMeta) => log("warn", message, meta),
	error: (message: string, meta?: LogMeta) => log("error", message, meta),
	debug: (message: string, meta?: LogMeta) => log("debug", message, meta),
};
