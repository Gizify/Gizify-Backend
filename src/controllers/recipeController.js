require("dotenv").config();
const Recipe = require("../models/Recipe");

// Retrieve all recipes from MongoDB
const getAllRecipes = async (req, res) => {
  try {
    const recipes = await Recipe.find();
    res.json(recipes);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Failed to fetch recipes" });
  }
};

module.exports = {
  getAllRecipes,
};
