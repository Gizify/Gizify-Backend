const mongoose = require("mongoose");
const MealLogSchema = require("./MealLog");

const NutritionStatsSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    total_calories: Number,
    total_protein: Number,
    total_carbs: Number,
    total_fat: Number,
    total_fiber: Number,
    total_sugar: Number,
    total_sodium: Number,
  },
  { _id: false }
);

const DailyTargetSchema = new mongoose.Schema(
  {
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number,
    fiber: Number,
    sugar: Number,
    sodium: Number,
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  passwordHash: String,
  gender: { type: String, enum: ["male", "female"] },
  birthdate: String,
  height: Number,
  weight: Number,
  activity_level: { type: String, enum: ["sedentary", "light", "moderate", "active", "very_active"] },
  goal: { type: String, enum: ["maintain", "gain"] },
  daily_nutrition_target: DailyTargetSchema,
  meal_logs: [MealLogSchema],
  nutrition_stats: [NutritionStatsSchema],
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Recipe" }],
});

module.exports = mongoose.model("User", UserSchema);
