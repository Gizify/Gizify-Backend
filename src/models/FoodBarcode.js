const mongoose = require("mongoose");
const NutritionInfoSchema = require("./NutritionInfoSchema");

const FoodBarcodeSchema = new mongoose.Schema({
  barcode: { type: String, unique: true },
  product_name: String,
  brand: String,
  nutrition_info: NutritionInfoSchema,
  ingredients_list: [String],
  image: String,
  source: String,
  updated_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("FoodBarcode", FoodBarcodeSchema);
