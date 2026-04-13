// Load environment variables from .env file before anything else
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");
const healthRoute = require("./routes/healthRoute");
const authRoutes   = require("./routes/authRoutes");     // ← Auth: register / login / me
const courseRoutes = require("./routes/courseRoutes");   // ← Courses: create / list / detail
const progressRoutes = require("./routes/progressRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes"); 
const analyticsRoutes  = require("./routes/analyticsRoutes");    
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

// ─── App Initialisation ───────────────────────────────────────────────────────

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Connect to Database ──────────────────────────────────────────────────────

connectDB();

// ─── Global Middleware ────────────────────────────────────────────────────────

// Parse incoming JSON request bodies
app.use(express.json());

// Enable Cross-Origin Resource Sharing
app.use(cors());

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use("/api/health", healthRoute);
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);   
app.use("/api/progress", progressRoutes);  
app.use("/api/dashboard", dashboardRoutes); 
app.use("/api/analytics", analyticsRoutes);

// Add future route modules here, e.g.:
// app.use("/api/users",    require("./routes/userRoutes"));
// app.use("/api/products", require("./routes/productRoutes"));

// ─── Error Handling ───────────────────────────────────────────────────────────

// Catch-all for undefined routes (must come after all valid routes)
app.use(notFound);

// Global error handler (must be last and have 4 parameters)
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
