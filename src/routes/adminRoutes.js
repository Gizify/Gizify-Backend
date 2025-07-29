const express = require("express");
const router = express.Router();
const foodBarcodeController = require("../controllers/adminController");
const nutrientController = require("../controllers/adminController");
const recipeController = require("../controllers/adminController");

// Create a new food barcode entry
router.post("/food-barcodes", foodBarcodeController.createFoodBarcode);

// Get all food barcode entries
router.get("/food-barcodes", foodBarcodeController.getAllFoodBarcodes);

// Get a single food barcode by barcode number
router.get("/food-barcodes/:barcode", foodBarcodeController.getFoodBarcodeByBarcode);

// Update a food barcode entry
router.put("/food-barcodes/:barcode", foodBarcodeController.updateFoodBarcode);
router.patch("/food-barcodes/:barcode", foodBarcodeController.updateFoodBarcode); // Alternative for partial updates

// Delete a food barcode entry
router.delete("/food-barcodes/:barcode", foodBarcodeController.deleteFoodBarcode);

// Create a new nutrient entry
router.post("/nutrients", nutrientController.createNutrient);

// Get all nutrient entries
router.get("/nutrients", nutrientController.getAllNutrients);

// Get nutrient by fdc_id
router.get("/nutrients/:fdc_id", nutrientController.getNutrientByFdcId);

// Update nutrient by fdc_id
router.put("/nutrients/:fdc_id", nutrientController.updateNutrient);
router.patch("/nutrients/:fdc_id", nutrientController.updateNutrient);

// Delete nutrient by fdc_id
router.delete("/nutrients/:fdc_id", nutrientController.deleteNutrient);

// Search nutrients
router.get("/nutrients/search", nutrientController.searchNutrients);

// Create a new recipe
router.post("/recipes", recipeController.createRecipe);

// Get all recipes (with optional search and tag filtering)
router.get("/recipes", recipeController.getAllRecipes);

// Get recipe by ID
router.get("/recipes/:id", recipeController.getRecipeById);

// Update recipe by ID
router.put("/recipes/:id", recipeController.updateRecipe);
router.patch("/recipes/:id", recipeController.updateRecipe);

// Delete recipe by ID
router.delete("/recipes/:id", recipeController.deleteRecipe);

// Get recipes by nutrition filter
router.get("/recipes/nutrition/filter", recipeController.getRecipesByNutrition);

module.exports = router;
