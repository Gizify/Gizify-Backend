const mongoose = require("mongoose");
const NutritionInfoSchema = require("./NutritionInfoSchema");

const IngredientSchema = new mongoose.Schema(
  {
    name: String,
    quantity: Number,
    unit: String,
  },
  { _id: false }
);

const RecipeSchema = new mongoose.Schema({
  title: String,
  ingredients: [IngredientSchema],
  steps: [String],
  nutrition_info: NutritionInfoSchema,
  created_at: { type: Date, default: Date.now },
  tags: [String],
});

module.exports = mongoose.model("Recipe", RecipeSchema);
