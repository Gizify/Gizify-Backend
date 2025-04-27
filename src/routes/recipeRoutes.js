const express = require("express");
const router = express.Router();
const recipeController = require("../controllers/recipeController");

// recipe route
router.get("/", recipeController.getAllRecipes);

module.exports = router;
