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

    let todayStats = user.nutrition_stats.find((entry) => entry.date.toDateString() === today.toDateString());

    if (!todayStats) {
      todayStats = {
        date: today,
        total_calories: 0,
        total_protein: 0,
        total_carbs: 0,
        total_fat: 0,
        total_fiber: 0,
        total_sugar: 0,
        total_sodium: 0,
      };
      user.nutrition_stats.push(todayStats);
    }

    todayStats.total_calories += adjustedNutrition.calories;
    todayStats.total_protein += adjustedNutrition.protein;
    todayStats.total_carbs += adjustedNutrition.carbs;
    todayStats.total_fat += adjustedNutrition.fat;
    todayStats.total_fiber += adjustedNutrition.fiber;
    todayStats.total_sugar += adjustedNutrition.sugar;
    todayStats.total_sodium += adjustedNutrition.sodium;

    // Update meal log
    let todayMealLog = user.meal_logs.find((log) => log.date.toDateString() === today.toDateString());

    const mealEntry = {
      source: "barcode",
      source_id: foodItem._id,
      name: foodItem.product_name,
      portion_size: portion_size,
      nutrition_info: {
        calories: adjustedNutrition.calories,
        protein: adjustedNutrition.protein,
        carbs: adjustedNutrition.carbs,
        fat: adjustedNutrition.fat,
        fiber: adjustedNutrition.fiber,
        sugar: adjustedNutrition.sugar,
        sodium: adjustedNutrition.sodium,
      },
      consumed_at: new Date(),
    };

    if (!todayMealLog) {
      todayMealLog = {
        date: today,
        meals: [mealEntry],
      };
      user.meal_logs.push(todayMealLog);
    } else {
      todayMealLog.meals.push(mealEntry);
    }

    await user.save();

    res.json({
      message: "Konsumsi berhasil ditambahkan",
      today_stats: todayStats,
      today_meals: todayMealLog.meals,
    });
  } catch (err) {
    console.error("Error menambahkan konsumsi:", err);
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};
module.exports = { addConsumptionFromBarcode };
