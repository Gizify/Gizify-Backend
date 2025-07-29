const FoodBarcode = require("../models/FoodBarcode");
const Nutrient = require("../models/FoodNutrient");
const Recipe = require("../models/Recipe");

// Create a new food barcode entry
exports.createFoodBarcode = async (req, res) => {
  try {
    const { barcode, product_name, brand, nutrition_info, ingredients_list, image, source } = req.body;

    const newFoodBarcode = new FoodBarcode({
      barcode,
      product_name,
      brand,
      nutrition_info,
      ingredients_list,
      image,
      source,
    });

    const savedFoodBarcode = await newFoodBarcode.save();
    res.status(201).json(savedFoodBarcode);
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error
      res.status(400).json({ message: "Barcode already exists" });
    } else {
      res.status(500).json({ message: "Error creating food barcode", error: error.message });
    }
  }
};

// Get all food barcode entries
exports.getAllFoodBarcodes = async (req, res) => {
  try {
    const foodBarcodes = await FoodBarcode.find().sort({ updated_at: -1 });
    res.status(200).json(foodBarcodes);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving food barcodes", error: error.message });
  }
};

// Get a single food barcode by barcode number
exports.getFoodBarcodeByBarcode = async (req, res) => {
  try {
    const foodBarcode = await FoodBarcode.findOne({ barcode: req.params.barcode });
    if (!foodBarcode) {
      return res.status(404).json({ message: "Food barcode not found" });
    }
    res.status(200).json(foodBarcode);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving food barcode", error: error.message });
  }
};

// Update a food barcode entry
exports.updateFoodBarcode = async (req, res) => {
  try {
    const updatedData = {
      ...req.body,
      updated_at: Date.now(), // Always update the timestamp on modification
    };

    const updatedFoodBarcode = await FoodBarcode.findOneAndUpdate({ barcode: req.params.barcode }, updatedData, { new: true, runValidators: true });

    if (!updatedFoodBarcode) {
      return res.status(404).json({ message: "Food barcode not found" });
    }

    res.status(200).json(updatedFoodBarcode);
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error
      res.status(400).json({ message: "Barcode already exists" });
    } else {
      res.status(500).json({ message: "Error updating food barcode", error: error.message });
    }
  }
};

// Delete a food barcode entry
exports.deleteFoodBarcode = async (req, res) => {
  try {
    const deletedFoodBarcode = await FoodBarcode.findOneAndDelete({ barcode: req.params.barcode });
    if (!deletedFoodBarcode) {
      return res.status(404).json({ message: "Food barcode not found" });
    }
    res.status(200).json({ message: "Food barcode deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting food barcode", error: error.message });
  }
};

// Create a new nutrient entry
exports.createNutrient = async (req, res) => {
  try {
    const { fdc_id, Food, Nutrient, Amount, Unit } = req.body;

    const newNutrient = new Nutrient({
      fdc_id,
      Food,
      Nutrient,
      Amount,
      Unit,
    });

    const savedNutrient = await newNutrient.save();
    res.status(201).json(savedNutrient);
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error (for fdc_id)
      res.status(400).json({ message: "fdc_id already exists" });
    } else if (error.name === "ValidationError") {
      res.status(400).json({ message: "Validation error", error: error.message });
    } else {
      res.status(500).json({ message: "Error creating nutrient", error: error.message });
    }
  }
};

// Get all nutrient entries with pagination
exports.getAllNutrients = async (req, res) => {
  try {
    // Ambil query params, default: page = 1, limit = 10
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Hitung jumlah dokumen yang dilewati
    const skip = (page - 1) * limit;

    // Ambil data + total count untuk pagination
    const [nutrients, total] = await Promise.all([Nutrient.find().sort({ createdAt: -1 }).skip(skip).limit(limit), Nutrient.countDocuments()]);

    res.status(200).json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: nutrients,
    });
  } catch (error) {
    res.status(500).json({ message: "Error retrieving nutrients", error: error.message });
  }
};

// Get nutrient by fdc_id
exports.getNutrientByFdcId = async (req, res) => {
  try {
    const nutrient = await Nutrient.findOne({ fdc_id: req.params.fdc_id });
    if (!nutrient) {
      return res.status(404).json({ message: "Nutrient not found" });
    }
    res.status(200).json(nutrient);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving nutrient", error: error.message });
  }
};

// Update nutrient by fdc_id
exports.updateNutrient = async (req, res) => {
  try {
    const updatedNutrient = await Nutrient.findOneAndUpdate({ fdc_id: req.params.fdc_id }, req.body, { new: true, runValidators: true });

    if (!updatedNutrient) {
      return res.status(404).json({ message: "Nutrient not found" });
    }

    res.status(200).json(updatedNutrient);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: "fdc_id already exists" });
    } else if (error.name === "ValidationError") {
      res.status(400).json({ message: "Validation error", error: error.message });
    } else {
      res.status(500).json({ message: "Error updating nutrient", error: error.message });
    }
  }
};

// Delete nutrient by fdc_id
exports.deleteNutrient = async (req, res) => {
  try {
    const deletedNutrient = await Nutrient.findOneAndDelete({ fdc_id: req.params.fdc_id });
    if (!deletedNutrient) {
      return res.status(404).json({ message: "Nutrient not found" });
    }
    res.status(200).json({ message: "Nutrient deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting nutrient", error: error.message });
  }
};

// Search nutrients by food name or nutrient name
exports.searchNutrients = async (req, res) => {
  try {
    const { query } = req.query;

    const nutrients = await Nutrient.find({
      $or: [{ Food: { $regex: query, $options: "i" } }, { Nutrient: { $regex: query, $options: "i" } }],
    }).sort({ createdAt: -1 });

    res.status(200).json(nutrients);
  } catch (error) {
    res.status(500).json({ message: "Error searching nutrients", error: error.message });
  }
};

// Create a new recipe
exports.createRecipe = async (req, res) => {
  try {
    const { title, ingredients, Ai, steps, nutrition_info, tags } = req.body;

    const newRecipe = new Recipe({
      title,
      ingredients,
      Ai: Ai || false,
      steps,
      nutrition_info,
      tags,
    });

    const savedRecipe = await newRecipe.save();
    res.status(201).json(savedRecipe);
  } catch (error) {
    if (error.name === "ValidationError") {
      res.status(400).json({ message: "Validation error", error: error.message });
    } else {
      res.status(500).json({ message: "Error creating recipe", error: error.message });
    }
  }
};

// Get all recipes
exports.getAllRecipes = async (req, res) => {
  try {
    const { search, tag } = req.query;
    let query = {};

    if (search) {
      query.title = { $regex: search, $options: "i" };
    }

    if (tag) {
      query.tags = tag;
    }

    const recipes = await Recipe.find(query).sort({ created_at: -1 });
    res.status(200).json(recipes);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving recipes", error: error.message });
  }
};

// Get recipe by ID
exports.getRecipeById = async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) {
      return res.status(404).json({ message: "Recipe not found" });
    }
    res.status(200).json(recipe);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving recipe", error: error.message });
  }
};

// Update recipe by ID
exports.updateRecipe = async (req, res) => {
  try {
    const updatedRecipe = await Recipe.findByIdAndUpdate(
      req.params.id,
      { ...req.body, created_at: Date.now() }, // Update timestamp
      { new: true, runValidators: true }
    );

    if (!updatedRecipe) {
      return res.status(404).json({ message: "Recipe not found" });
    }

    res.status(200).json(updatedRecipe);
  } catch (error) {
    if (error.name === "ValidationError") {
      res.status(400).json({ message: "Validation error", error: error.message });
    } else {
      res.status(500).json({ message: "Error updating recipe", error: error.message });
    }
  }
};

// Delete recipe by ID
exports.deleteRecipe = async (req, res) => {
  try {
    const deletedRecipe = await Recipe.findByIdAndDelete(req.params.id);
    if (!deletedRecipe) {
      return res.status(404).json({ message: "Recipe not found" });
    }
    res.status(200).json({ message: "Recipe deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting recipe", error: error.message });
  }
};

// Get recipes by nutrition filter
exports.getRecipesByNutrition = async (req, res) => {
  try {
    const { nutrient, min, max } = req.query;

    if (!nutrient || !min || !max) {
      return res.status(400).json({ message: "Missing nutrient, min, or max parameters" });
    }

    const query = {};
    query[`nutrition_info.${nutrient}`] = {
      $gte: parseFloat(min),
      $lte: parseFloat(max),
    };

    const recipes = await Recipe.find(query).sort({ created_at: -1 });
    res.status(200).json(recipes);
  } catch (error) {
    res.status(500).json({ message: "Error filtering recipes by nutrition", error: error.message });
  }
};
