const express = require("express");
const router = express.Router();

// Import each route module
const productRoutes = require("./product.routes");

// Prefix & use them
router.use("/products", productRoutes);

module.exports = router;
