const jwt = require("jsonwebtoken");

/**
 * Generates a signed JWT for the given user ID.
 *
 * @param   {string} userId  - The MongoDB _id of the authenticated user
 * @returns {string}           Signed JWT string, valid for 7 days
 */
const generateToken = (userId) => {
  return jwt.sign(
    { userId },                       // Payload — keep it minimal
    process.env.JWT_SECRET,           // Secret from environment
    { expiresIn: "7d" }               // Token lifetime
  );
};

module.exports = generateToken;
