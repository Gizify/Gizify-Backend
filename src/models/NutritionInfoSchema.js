const mongoose = require("mongoose");

const NutritionInfoSchema = new mongoose.Schema(
  {
    calories: mongoose.Schema.Types.Mixed,
    protein: mongoose.Schema.Types.Mixed,
    carbs: mongoose.Schema.Types.Mixed,
    fat: mongoose.Schema.Types.Mixed,
    fiber: mongoose.Schema.Types.Mixed,
    sugar: mongoose.Schema.Types.Mixed,
    added_sugar: mongoose.Schema.Types.Mixed,
    sodium: mongoose.Schema.Types.Mixed,
    folic_acid: mongoose.Schema.Types.Mixed,
    kalsium: mongoose.Schema.Types.Mixed,
    vitamin_d: mongoose.Schema.Types.Mixed,
    vitamin_b12: mongoose.Schema.Types.Mixed,
    vitamin_b6: mongoose.Schema.Types.Mixed,
    vitamin_c: mongoose.Schema.Types.Mixed,
    zinc: mongoose.Schema.Types.Mixed,
    iodium: mongoose.Schema.Types.Mixed,
    water: mongoose.Schema.Types.Mixed,
    vitamin_a: mongoose.Schema.Types.Mixed,
    vitamin_e: mongoose.Schema.Types.Mixed,
    magnesium: mongoose.Schema.Types.Mixed,
    selenium: mongoose.Schema.Types.Mixed,
    iron: mongoose.Schema.Types.Mixed,
    date: String,
  },
  { _id: false }
);

module.exports = NutritionInfoSchema;
