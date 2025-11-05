import { Redis } from "ioredis";
import config from "../config/env.js";

// Create Redis client with configuration
const redis = new Redis(config.REDIS_URL, {
	maxRetriesPerRequest: 3,
	lazyConnect: true,
});

redis.on("connect", () => {
	console.log("Connected to Redis");
});

redis.on("error", (err: Error) => {
	console.error("Redis connection error:", err);
});

await redis.connect();

export { redis };
