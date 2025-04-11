const MealSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["breakfast", "lunch", "dinner", "snack"] },
    source: { type: String, enum: ["recipe", "barcode", "manual"] },
    source_id: mongoose.Schema.Types.ObjectId, // can be Recipe or Barcode
    nutrition_info: NutritionInfoSchema,
  },
  { _id: false }
);

const MealLogSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  date: { type: Date, required: true },
  meals: [MealSchema],
});

module.exports = mongoose.model("MealLog", MealLogSchema);
