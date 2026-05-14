const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');

// Middleware to authenticate JWT
module.exports = function (req, res, next) {
  // Extract Bearer token from the Authorization header (RFC 6750)
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    throw new AppError('No token, authorization denied', 401);
  }

  // Express catches synchronous jwt.verify errors and forwards them to errorHandler.
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = decoded.user;
  next();
};
