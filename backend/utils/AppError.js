/**
 * Custom error class for operational errors.
 * Allows routes and middleware to throw errors with a specific HTTP status code.
 *
 * Usage:
 *   throw new AppError("User not found", 404);
 *   next(new AppError("Unauthorized", 401));
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    // Capture stack trace, excluding the constructor call from the trace
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
