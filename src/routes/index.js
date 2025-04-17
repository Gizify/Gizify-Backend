const express = require("express");
const router = express.Router();

const userRoutes = require("./userRoutes");
const productRoutes = require("./product.routes");

router.use("/user", userRoutes);
router.use("/products", productRoutes);

module.exports = router;
