const express = require("express");
const connectDB = require("./config/db");

const app = express();

// Connect to DB
connectDB();

// Middleware
app.use(express.json());

// Routes
const userRoutes = require("./routes/userRoutes");
app.use("/api/users", userRoutes);

module.exports = app;
