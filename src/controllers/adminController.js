const FoodBarcode = require("../models/FoodBarcode");

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
