const User = require("../models/User");
const FoodBarcode = require("../models/FoodBarcode");

const addConsumptionFromBarcode = async (req, res) => {
  try {
    const { userId } = req;
    const { barcode, portion_size = 1 } = req.body;

    const foodItem = await FoodBarcode.findOne({ barcode });
    if (!foodItem) {
      return res.status(404).json({ message: "Makanan dengan barcode ini tidak ditemukan." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User tidak ditemukan" });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const adjustedNutrition = {
      calories: foodItem.nutrition_info.calories * portion_size,
      protein: foodItem.nutrition_info.protein * portion_size,
      carbs: foodItem.nutrition_info.carbs * portion_size,
      fat: foodItem.nutrition_info.fat * portion_size,
      fiber: foodItem.nutrition_info.fiber * portion_size,
      sugar: foodItem.nutrition_info.sugar * portion_size,
      sodium: foodItem.nutrition_info.sodium * portion_size,
    };

    const statsIndex = user.nutrition_stats.findIndex((entry) => new Date(entry.date).toDateString() === today.toDateString());

    if (statsIndex === -1) {
      user.nutrition_stats.push({
        date: today,
        total_calories: adjustedNutrition.calories,
        total_protein: adjustedNutrition.protein,
        total_carbs: adjustedNutrition.carbs,
        total_fat: adjustedNutrition.fat,
        total_fiber: adjustedNutrition.fiber,
        total_sugar: adjustedNutrition.sugar,
        total_sodium: adjustedNutrition.sodium,
      });
    } else {
      user.nutrition_stats[statsIndex].total_calories += adjustedNutrition.calories;
      user.nutrition_stats[statsIndex].total_protein += adjustedNutrition.protein;
      user.nutrition_stats[statsIndex].total_carbs += adjustedNutrition.carbs;
      user.nutrition_stats[statsIndex].total_fat += adjustedNutrition.fat;
      user.nutrition_stats[statsIndex].total_fiber += adjustedNutrition.fiber;
      user.nutrition_stats[statsIndex].total_sugar += adjustedNutrition.sugar;
      user.nutrition_stats[statsIndex].total_sodium += adjustedNutrition.sodium;
    }

    let todayMealLog = user.meal_logs.find((log) => new Date(log.date).toDateString() === today.toDateString());

    const mealEntry = {
      source: "barcode",
      source_id: foodItem._id,
      name: foodItem.product_name,
      portion_size: portion_size,
      nutrition_info: adjustedNutrition,
      consumed_at: new Date(),
    };

    if (!todayMealLog) {
      user.meal_logs.push({
        date: today,
        meals: [mealEntry],
      });
    } else {
      todayMealLog.meals.push(mealEntry);
    }

    await user.save();

    const finalStats = user.nutrition_stats.find((entry) => new Date(entry.date).toDateString() === today.toDateString());
    const finalMeals = user.meal_logs.find((entry) => new Date(entry.date).toDateString() === today.toDateString());

    res.json({
      message: "Konsumsi berhasil ditambahkan",
      today_stats: finalStats,
      today_meals: finalMeals?.meals || [],
    });
  } catch (err) {
    console.error("Error menambahkan konsumsi:", err);
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};
module.exports = { addConsumptionFromBarcode };
