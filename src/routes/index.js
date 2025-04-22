const express = require("express");
const router = express.Router();

const userRoutes = require("./userRoutes");
const productRoutes = require("./product.routes");
const authRoutes = require("./authRoutes");
const authMiddleware = require("../middlewares/authMiddleware");
const recipeRoutes = require("./recipeRoutes");

router.use("/user", authMiddleware, userRoutes);
router.use("/products", productRoutes);
router.use("/auth", authRoutes);
router.use("/recipe", recipeRoutes);

module.exports = router;
