const mongoose = require("mongoose");
const MealLogSchema = require("./MealLog");
const NutritionInfoSchema = require("./NutritionInfoSchema");

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  passwordHash: String,
  birthdate: String,
  gestational_age: {
    months: { type: Number },
    days: { type: Number },
  },
  trimester: { type: Number, enum: [1, 2, 3] },
  height: Number,
  weight: Number,
  activity_level: { type: String, enum: ["Ringan", "Sedang", "Berat"] },
  medical_history: [String],
  daily_nutrition_target: NutritionInfoSchema,
  meal_logs: [MealLogSchema],
  nutrition_stats: [NutritionInfoSchema],
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Recipe" }],
  photoOption: String,
});

module.exports = mongoose.model("User", UserSchema);
