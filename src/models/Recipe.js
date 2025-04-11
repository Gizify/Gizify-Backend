const IngredientSchema = new mongoose.Schema(
  {
    name: String,
    quantity: Number,
    unit: String,
  },
  { _id: false }
);

const NutritionInfoSchema = new mongoose.Schema(
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

const RecipeSchema = new mongoose.Schema({
  title: String,
  author_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  ingredients: [IngredientSchema],
  steps: [String],
  nutrition_info: NutritionInfoSchema,
  created_at: { type: Date, default: Date.now },
  tags: [String],
  visibility: { type: String, enum: ["public", "private"], default: "public" },
});

module.exports = mongoose.model("Recipe", RecipeSchema);
