import redisClient from "../../config/redisConfig.js";

export const createRateLimit = ({ getRules, window }) => {
  return async (req, res, next) => {
    try {
      const rules = getRules(req);

      if (!rules || rules.length === 0) return next();

      const results = await Promise.all(
        rules.map(async (rule) => {
          const count = await redisClient.incr(rule.key);

          if (count === 1) await redisClient.expire(rule.key, window);

          return { ...rule, count };
        }),
      );

      const exceeded = results.some(
        ({ count, maxAttempts }) => count > maxAttempts,
      );

      if (exceeded)
        return res
          .status(429)
          .json({ message: "Too many attempts. Please try again later." });

      next();
    } catch (error) {
      console.error("Rate limit error:", err);
      next();
    }
  };
};

export const loginRateLimit = createRateLimit({
  getRules: (req) => [
    {
      key: `rateLimit:login:ip:${req.ip}`,
      maxAttempts: 15,
    },
    {
      key: `rateLimit:login:email:${req.body.email?.trim().toLowerCase()}`,
      maxAttempts: 5,
    },
  ],
  window: 15 * 60,
});
