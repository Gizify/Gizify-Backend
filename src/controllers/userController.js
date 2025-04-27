const User = require("../models/User");
const FoodBarcode = require("../models/FoodBarcode");
const { DateTime } = require("luxon");
const Recipe = require("../models/Recipe");
const axios = require("axios");

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

      foodName = recipe.title;
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

// Generate resep dengan AI
const generateRecipe = async (req, res) => {
  const { ingredients, difficulty, cuisine, daily_nutrition_target, nutrition_stats } = req.body;

  if (!ingredients || !difficulty || !cuisine || !daily_nutrition_target || !nutrition_stats) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Menghitung kekurangan nutrisi
    const deficits = getNutrientDeficits(daily_nutrition_target, nutrition_stats);

    // Membuat prompt dengan kekurangan nutrisi
    const prompt = `
Saya ingin membuat resep makanan dari bahan berikut: ${ingredients.join(", ")}.
Tingkat kesulitan: ${difficulty}.
Jenis masakan: ${cuisine}.
Berikut adalah target nutrisi saya hari ini:
- Kalori: ${daily_nutrition_target.calories}
- Protein: ${daily_nutrition_target.protein}
- Karbohidrat: ${daily_nutrition_target.carbs}
- Lemak: ${daily_nutrition_target.fat}
- Serat: ${daily_nutrition_target.fiber}
- Gula: ${daily_nutrition_target.sugar}
- Natrium: ${daily_nutrition_target.sodium}

Namun, saya telah mengonsumsi makanan berikut pada hari ini:
- Kalori: ${nutrition_stats.total_calories}
- Protein: ${nutrition_stats.total_protein}
- Karbohidrat: ${nutrition_stats.total_carbs}
- Lemak: ${nutrition_stats.total_fat}
- Serat: ${nutrition_stats.total_fiber}
- Gula: ${nutrition_stats.total_sugar}
- Natrium: ${nutrition_stats.total_sodium}

Dengan kekurangan berikut:
- Kalori kurang: ${deficits.calories} kcal
- Protein kurang: ${deficits.protein} g
- Karbohidrat kurang: ${deficits.carbs} g
- Lemak kurang: ${deficits.fat} g
- Serat kurang: ${deficits.fiber} g
- Gula kurang: ${deficits.sugar} g
- Natrium kurang: ${deficits.sodium} mg

Tolong bantu saya membuat resep yang tidak hanya menggunakan bahan tersebut, tetapi juga membantu saya memenuhi kekurangan nutrisi ini.

Balas dalam format JSON berikut:

{
  "bahan": ["..."],
  "langkah": ["..."],
  "gizi": {
    "kalori": "...",
    "protein": "...",
    "lemak": "...",
    "gula": "...",
    "garam": "...",
    "serat": "..."
  }
}
`;

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.AI_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const aiRaw = response.data.choices[0].message.content;

    const jsonStart = aiRaw.indexOf("{");
    const jsonEnd = aiRaw.lastIndexOf("}");
    const jsonString = aiRaw.slice(jsonStart, jsonEnd + 1);

    const parsedResult = JSON.parse(jsonString);

    res.json({ result: parsedResult });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Failed to generate recipe" });
  }
};

const getNutrientDeficits = (dailyTarget, nutritionStats) => {
  const deficits = {
    calories: dailyTarget.calories - nutritionStats.total_calories,
    protein: dailyTarget.protein - nutritionStats.total_protein,
    carbs: dailyTarget.carbs - nutritionStats.total_carbs,
    fat: dailyTarget.fat - nutritionStats.total_fat,
    fiber: dailyTarget.fiber - nutritionStats.total_fiber,
    sugar: dailyTarget.sugar - nutritionStats.total_sugar,
    sodium: dailyTarget.sodium - nutritionStats.total_sodium,
  };

  return deficits;
};

module.exports = { addConsumption, generateRecipe };
