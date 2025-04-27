const User = require("../models/User");
const FoodBarcode = require("../models/FoodBarcode");
const { DateTime } = require("luxon");
const Recipe = require("../models/Recipe");

const addConsumptionFromBarcode = async (req, res) => {
  try {
    const { userId } = req;
    const { barcode, portion_size = 1, userTimeZone = "Asia/Jakarta" } = req.body;

    const foodItem = await FoodBarcode.findOne({ barcode });
    if (!foodItem) {
      return res.status(404).json({ message: "Makanan dengan barcode ini tidak ditemukan." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User tidak ditemukan" });

    const userToday = DateTime.now().setZone(userTimeZone).startOf("day");
    const todayStart = userToday.toJSDate();
    const todayEnd = userToday.endOf("day").toJSDate();

    const adjustedNutrition = {
      calories: foodItem.nutrition_info.calories * portion_size,
      protein: foodItem.nutrition_info.protein * portion_size,
      carbs: foodItem.nutrition_info.carbs * portion_size,
      fat: foodItem.nutrition_info.fat * portion_size,
      fiber: foodItem.nutrition_info.fiber * portion_size,
      sugar: foodItem.nutrition_info.sugar * portion_size,
      sodium: foodItem.nutrition_info.sodium * portion_size,
    };

    const statsIndex = user.nutrition_stats.findIndex((entry) => {
      const entryDate = DateTime.fromJSDate(new Date(entry.date)).setZone(userTimeZone).startOf("day");
      return entryDate.equals(userToday);
    });

    if (statsIndex === -1) {
      user.nutrition_stats.push({
        date: todayStart,
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

    let todayMealLog = user.meal_logs.find((log) => {
      const logDate = DateTime.fromJSDate(new Date(log.date)).setZone(userTimeZone).startOf("day");
      return logDate.equals(userToday);
    });

    const mealEntry = {
      source: "barcode",
      source_id: foodItem._id,
      name: foodItem.product_name,
      portion_size: portion_size,
      nutrition_info: adjustedNutrition,
      consumed_at: DateTime.now().setZone(userTimeZone).toJSDate(),
    };

    if (!todayMealLog) {
      user.meal_logs.push({
        date: todayStart,
        meals: [mealEntry],
      });
    } else {
      todayMealLog.meals.push(mealEntry);
    }

    await user.save();

    const finalStats = user.nutrition_stats.find((entry) => {
      const entryDate = DateTime.fromJSDate(new Date(entry.date)).setZone(userTimeZone).startOf("day");
      return entryDate.equals(userToday);
    });

    const finalMeals = user.meal_logs.find((entry) => {
      const entryDate = DateTime.fromJSDate(new Date(entry.date)).setZone(userTimeZone).startOf("day");
      return entryDate.equals(userToday);
    });

    res.json({
      message: "Konsumsi berhasil ditambahkan",
      today_stats: finalStats
        ? {
            ...finalStats._doc,
            date: DateTime.fromJSDate(finalStats.date).setZone(userTimeZone).toISO(),
          }
        : null,
      today_meals:
        finalMeals?.meals.map((meal) => ({
          ...meal._doc,
          consumed_at: DateTime.fromJSDate(meal.consumed_at).setZone(userTimeZone).toISO(),
        })) || [],
      timezone: userTimeZone,
    });
  } catch (err) {
    console.error("Error menambahkan konsumsi:", err);
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

const addConsumption = async (req, res) => {
  try {
    const { userId } = req;
    const { source, source_id, portion_size = 1, userTimeZone = "Asia/Jakarta" } = req.body;

    // Validasi input
    if (!["barcode", "recipe"].includes(source)) {
      return res.status(400).json({ message: "Source harus berupa 'barcode' atau 'recipe'" });
    }

    let foodName, adjustedNutrition;

    // Handle different sources
    if (source === "barcode") {
      const foodItem = await FoodBarcode.findOne({ barcode: source_id });
      if (!foodItem) {
        return res.status(404).json({ message: "Makanan dengan barcode ini tidak ditemukan." });
      }

      foodName = foodItem.product_name;
      adjustedNutrition = calculateAdjustedNutrition(foodItem.nutrition_info, portion_size);
    } else if (source === "recipe") {
      const recipe = await Recipe.findById(source_id);
      if (!recipe) {
        return res.status(404).json({ message: "Resep tidak ditemukan." });
      }

      foodName = recipe.name;
      adjustedNutrition = calculateAdjustedNutrition(recipe.nutrition_info, portion_size);
    }

    // Update user data
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User tidak ditemukan" });

    const userToday = DateTime.now().setZone(userTimeZone).startOf("day");
    const todayStart = userToday.toJSDate();
    const todayEnd = userToday.endOf("day").toJSDate();

    // Update nutrition stats
    const statsIndex = user.nutrition_stats.findIndex((entry) => {
      const entryDate = DateTime.fromJSDate(new Date(entry.date)).setZone(userTimeZone).startOf("day");
      return entryDate.equals(userToday);
    });

    if (statsIndex === -1) {
      user.nutrition_stats.push({
        date: todayStart,
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

    // Update meal log
    let todayMealLog = user.meal_logs.find((log) => {
      const logDate = DateTime.fromJSDate(new Date(log.date)).setZone(userTimeZone).startOf("day");
      return logDate.equals(userToday);
    });

    const mealEntry = {
      source,
      source_id,
      name: foodName,
      portion_size,
      nutrition_info: adjustedNutrition,
      consumed_at: DateTime.now().setZone(userTimeZone).toJSDate(),
    };

    if (!todayMealLog) {
      user.meal_logs.push({
        date: todayStart,
        meals: [mealEntry],
      });
    } else {
      todayMealLog.meals.push(mealEntry);
    }

    await user.save();

    const finalStats = user.nutrition_stats.find((entry) => {
      const entryDate = DateTime.fromJSDate(new Date(entry.date)).setZone(userTimeZone).startOf("day");
      return entryDate.equals(userToday);
    });

    const finalMeals = user.meal_logs.find((entry) => {
      const entryDate = DateTime.fromJSDate(new Date(entry.date)).setZone(userTimeZone).startOf("day");
      return entryDate.equals(userToday);
    });

    res.json({
      message: "Konsumsi berhasil ditambahkan",
      today_stats: finalStats
        ? {
            ...finalStats._doc,
            date: DateTime.fromJSDate(finalStats.date).setZone(userTimeZone).toISO(),
          }
        : null,
      today_meals:
        finalMeals?.meals.map((meal) => ({
          ...meal._doc,
          consumed_at: DateTime.fromJSDate(meal.consumed_at).setZone(userTimeZone).toISO(),
        })) || [],
      timezone: userTimeZone,
    });
  } catch (err) {
    console.error("Error menambahkan konsumsi:", err);
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

// Helper function
function calculateAdjustedNutrition(nutritionInfo, portion_size) {
  return {
    calories: nutritionInfo.calories * portion_size,
    protein: nutritionInfo.protein * portion_size,
    carbs: nutritionInfo.carbs * portion_size,
    fat: nutritionInfo.fat * portion_size,
    fiber: nutritionInfo.fiber * portion_size,
    sugar: nutritionInfo.sugar * portion_size,
    sodium: nutritionInfo.sodium * portion_size,
  };
}
module.exports = { addConsumptionFromBarcode, addConsumption };
