/**
 * Centralized Error Handling Middleware
 * Must be registered LAST in Express middleware chain (after all routes)
 */

// Custom error class for operational errors
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Handle Mongoose CastError (invalid ObjectId)
const handleCastError = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

// Handle Mongoose duplicate key error
const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `Duplicate value for field '${field}': '${value}'. Please use a different value.`;
  return new AppError(message, 400);
};

// Handle Mongoose validation errors
const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Validation failed: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

// Handle JWT invalid signature error
const handleJWTError = () =>
  new AppError('Invalid token. Please log in again.', 401);

// Handle JWT expired error
const handleJWTExpiredError = () =>
  new AppError('Your token has expired. Please log in again.', 401);

// Send detailed error in development
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

// Send minimal error in production
const sendErrorProd = (err, res) => {
  // Operational errors: safe to send to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    // Programming or unknown errors: don't leak details
    console.error('UNEXPECTED ERROR:', err);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong. Please try again later.',
    });
  }
};

// Global error handling middleware (4 arguments required by Express)
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || (String(err.statusCode).startsWith('4') ? 'fail' : 'error');

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    sendErrorDev(err, res);
  } else {
    let error = { ...err, message: err.message, name: err.name };

    // Transform known error types into operational AppErrors
    if (error.name === 'CastError')              error = handleCastError(error);
    if (error.code === 11000)                    error = handleDuplicateKeyError(error);
    if (error.name === 'ValidationError')        error = handleValidationError(error);
    if (error.name === 'JsonWebTokenError')      error = handleJWTError();
    if (error.name === 'TokenExpiredError')      error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};

// Middleware for unhandled routes (404)
const notFound = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

module.exports = { errorHandler, notFound, AppError };