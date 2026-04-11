const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");

/**
 * Protect Middleware
 * Verifies the JWT supplied in the Authorization header.
 * On success, attaches the decoded userId to req for downstream use.
 *
 * Expected header format:
 *   Authorization: Bearer <token>
 */
const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // 1. Check header exists and is in the correct format
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("No token provided. Access denied.", 401));
  }

  // 2. Extract the raw token string
  const token = authHeader.split(" ")[1];

  // 3. Verify and decode the token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Attach userId to the request object for use in controllers
    req.userId = decoded.userId;

    next();
  } catch (err) {
    return next(new AppError("Invalid or expired token. Access denied.", 401));
  }
};

module.exports = { protect };
