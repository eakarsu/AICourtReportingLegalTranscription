const rateLimit = require('express-rate-limit');

// 20 AI calls per hour per user (identified by JWT userId or IP)
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  keyGenerator: (req) => {
    return (req.user && req.user.id) ? `user:${req.user.id}` : req.ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many AI requests. You are limited to 20 AI calls per hour. Please try again later.',
    retryAfter: 'See Retry-After header'
  },
  handler: (req, res, next, options) => {
    res.status(429).json(options.message);
  }
});

// General API rate limiter (100 requests per 15 minutes)
const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' }
});

module.exports = { aiRateLimiter, generalRateLimiter };
