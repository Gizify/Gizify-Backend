const express = require("express");
const router = express.Router();
const recipeController = require("../controllers/recipeController");

// recipe route
router.post("/generate", recipeController.generateRecipe);
router.get("/", recipeController.getAllRecipes);

module.exports = router;
