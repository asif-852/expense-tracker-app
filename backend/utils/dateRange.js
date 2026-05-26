const { AppError } = require('../middleware/errorHandler');

/**
 * Parse `from` / `to` query parameters into a Mongo-friendly date filter.
 *
 * Behaviour:
 *  - `from` is parsed as-is and used as `$gte`.
 *  - `to` is extended to end-of-day (23:59:59.999 in server local time) and
 *    used as `$lte`. This matches the typical UX expectation that
 *    `to=2026-01-31` should include every transaction logged on Jan 31, not
 *    only those at exactly midnight.
 *
 * Throws AppError(400) for malformed dates.
 *
 * @param {Object} query
 * @param {string} [query.from] - ISO 8601 date string
 * @param {string} [query.to]   - ISO 8601 date string
 * @param {string} [field='date']
 * @returns {Object} a partial filter object, e.g. { date: { $gte, $lte } } or {}
 */
function buildDateFilter({ from, to } = {}, field = 'date') {
  if (!from && !to) return {};

  const range = {};

  if (from) {
    const fromDate = new Date(from);
    if (isNaN(fromDate.getTime())) {
      throw new AppError("Invalid 'from' date format", 400);
    }
    range.$gte = fromDate;
  }

  if (to) {
    const toDate = new Date(to);
    if (isNaN(toDate.getTime())) {
      throw new AppError("Invalid 'to' date format", 400);
    }
    toDate.setHours(23, 59, 59, 999);
    range.$lte = toDate;
  }

  return { [field]: range };
}

module.exports = { buildDateFilter };
