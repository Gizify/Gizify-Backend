const mongoose = require("mongoose");
const NutritionInfoSchema = require("./NutritionInfo");

const IngredientDBSchema = new mongoose.Schema({
  name: String,
  aliases: [String],
  default_nutrition_per_100g: NutritionInfoSchema,
  unit_conversions: {
    type: Map,
    of: Number,
  },
});

module.exports = mongoose.model("IngredientDB", IngredientDBSchema);
