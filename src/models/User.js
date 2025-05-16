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
    total_folic_acid: Number,
    total_kalsium: Number,
    total_vitamin_d: Number,
    total_vitamin_b16: Number,
    total_vitamin_b12: Number,
    total_vitamin_c: Number,
    total_zinc: Number,
    total_iodium: Number,
    total_water: Number,
    total_iron: Number,
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

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  passwordHash: String,
  age: Number,
  gestational_age: Number,
  height: Number,
  weight: Number,
  activity_level: { type: String, enum: ["Ringan", "Sedang", "Berat"] },
  daily_nutrition_target: DailyTargetSchema,
  meal_logs: [MealLogSchema],
  nutrition_stats: [NutritionStatsSchema],
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Recipe" }],
});

module.exports = mongoose.model("User", UserSchema);
