import { createClient } from "redis";

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", () => console.error("Redis client error", error));

await redisClient.connect();

export default redisClient;
