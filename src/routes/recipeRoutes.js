const express = require("express");
const router = express.Router();
const recipeController = require("../controllers/recioeController");

router.get("/generate", recipeController.generateRecipe);

module.exports = router;
