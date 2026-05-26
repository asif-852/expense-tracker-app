const rateLimit = require('express-rate-limit');

/**
 * Build a JSON-shaped rate-limit handler so responses match the rest of the API.
 */
const handler = (req, res, _next, options) => {
  res.status(options.statusCode).json({
    status: 'fail',
    message: options.message,
  });
};

/**
 * Strict limiter for unauthenticated auth endpoints (login / register / refresh).
 * Defends against credential stuffing, account enumeration, and refresh-token
 * brute force.
 *
 * 10 requests per 15 minutes per IP. Successful logins still count, so a real
 * user signing in normally is well under the limit.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,    // RateLimit-* headers (RFC 6585)
  legacyHeaders: false,     // disable X-RateLimit-*
  message: 'Too many authentication attempts. Please try again in 15 minutes.',
  handler,
});

/**
 * General API limiter applied globally. Generous enough to not interfere with
 * normal browsing (dashboard load, transaction CRUD), but caps abusive clients.
 *
 * 200 requests per 15 minutes per IP.
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests. Please slow down and try again later.',
  handler,
});

module.exports = { authLimiter, globalLimiter };
