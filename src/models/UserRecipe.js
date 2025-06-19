const mongoose = require("mongoose");

const NutritionInfoSchema = require("./NutritionInfoSchema");

const IngredientSchema = new mongoose.Schema(
  {
    name: String,
    quantity: Number,
    unit: String,
    nutrients: [
      {
        nutrient: String,
        value: Number,
        unit: String,
        source: String,
      },
    ],
  },
  { _id: false }
);

const UserRecipeSchema = new mongoose.Schema({
  title: String,
  ingredients: [IngredientSchema],
  nutrition_info: NutritionInfoSchema,
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("UserRecipe", UserRecipeSchema);
