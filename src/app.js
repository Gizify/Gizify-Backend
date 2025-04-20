const express = require("express");
const connectDB = require("./config/db");
const cors = require("cors");

const app = express();

// CORS middleware
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Connect to DB
connectDB();

// Middleware
app.use(express.json());

// Routes
const routes = require("./routes");
app.use("/api", routes);

module.exports = app;
