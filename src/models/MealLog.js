const mongoose = require("mongoose");
const NutritionInfoSchema = require("./nutritionInfo");

const MealSchema = new mongoose.Schema(
  {
    source: { type: String, enum: ["recipe", "barcode", "manual"] },
    source_id: mongoose.Schema.Types.ObjectId,
    name: String,
    portion_size: Number,
    nutrition_info: NutritionInfoSchema,
    consumed_at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const MealLogSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    meals: [MealSchema],
  },
  { _id: false }
);

module.exports = MealLogSchema;
