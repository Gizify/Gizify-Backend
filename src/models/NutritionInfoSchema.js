const mongoose = require("mongoose");

const NutritionInfoSchema = new mongoose.Schema(
  {
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number,
    fiber: Number,
    sugar: Number,
    sodium: Number,
    folic_acid: Number,
    kalsium: Number,
    vitamin_d: Number,
    vitamin_b16: Number,
    vitamin_b12: Number,
    vitamin_c: Number,
    zinc: Number,
    iodium: Number,
    water: Number,
    iron: Number,
  },
  { _id: false }
);

module.exports = NutritionInfoSchema;
