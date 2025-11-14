export const title = "Project Title Here";

// Export grouped shared modules (barrel)
export * from "./auth/constants.js";
export * from "./auth/schemas.js";
export * from "./auth/types.js";
export * from "./auth/timing.js";
export * from "./errors.js";
export * from "./tickets/schemas.js";

// Utility functions
export const formatDate = (date: Date): string => {
	return new Intl.DateTimeFormat("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	}).format(date);
};

export const generateId = (): string => {
	return Math.random().toString(36).substring(2) + Date.now().toString(36);
};
