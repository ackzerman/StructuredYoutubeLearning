const mongoose = require("mongoose");

/**
 * User Model
 * Core identity model for the application.
 * Stores credentials and tracks learning streak activity.
 * Passwords are stored as bcrypt hashes — never in plain text.
 *
 * Relationships:
 *   One User → many Courses
 *   One User → many Progress records
 *   One User → many DailyActivity records
 *   One User → many Notes
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,       // Enforced at DB level
      lowercase: true,    // Normalise before saving
      trim: true,
      match: [
        /^\S+@\S+\.\S+$/,
        "Please provide a valid email address",
      ],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },

    // Number of consecutive days the user has been active
    streak: {
      type: Number,
      default: 0,
    },

    // Used alongside DailyActivity to compute and update the streak
    lastActiveDate: {
      type: Date,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

/**
 * Exclude the password field whenever a User document is serialised to JSON.
 * This prevents accidental password leaks in any API response.
 */
userSchema.set("toJSON", {
  transform(doc, ret) {
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);
