/**
 * Global error-handling middleware.
 * Must be registered LAST in server.js (after all routes).
 *
 * Catches errors passed via next(err) from any route or middleware.
 */
const errorHandler = (err, req, res, next) => {
  // Use the error's status code if set, otherwise default to 500
  const statusCode = err.statusCode || 500;

  console.error(`[Error] ${err.message}`);

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    // Only expose the stack trace in development
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorHandler;
