const express = require("express");
const connectDB = require("./config/db");

const app = express();

// Connect to DB
connectDB();

// Middleware
app.use(express.json());

// Routes
const routes = require("./routes");
app.use("/api", routes);

module.exports = app;
