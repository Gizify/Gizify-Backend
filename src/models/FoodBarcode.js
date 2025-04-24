const mongoose = require("mongoose");
const NutritionInfoSchema = require("./nutritionInfo");

const FoodBarcodeSchema = new mongoose.Schema({
  barcode: { type: String, unique: true },
  product_name: String,
  brand: String,
  nutrition_info: NutritionInfoSchema,
  ingredients_list: [String],
  image: String,
  updated_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("FoodBarcode", FoodBarcodeSchema);
