const mongoose = require("mongoose");

const NutritionInfoSchema = new mongoose.Schema(
  {
    calories: Number,
    carbs: Number,
    protein: Number,
    fat: Number,
    sugar: Number,
    sodium: Number,
    fiber: Number,
  },
  { _id: false }
);

module.exports = NutritionInfoSchema;
