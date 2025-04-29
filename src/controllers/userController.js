const User = require("../models/User");
const FoodBarcode = require("../models/FoodBarcode");
const { DateTime } = require("luxon");
const Recipe = require("../models/Recipe");
const axios = require("axios");
const mongoose = require("mongoose");

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
  const { ingredients, difficulty, cuisine, daily_nutrition_target, nutrition_stats = {} } = req.body;

  if (!ingredients || !difficulty || !cuisine || !daily_nutrition_target) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Membuat prompt dengan kekurangan nutrisi
    const prompt = `Saya ingin membuat resep makanan dari bahan berikut: ${ingredients.join(", ")}.
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
        - Kalori: ${nutrition_stats?.total_calories || 0}
        - Protein: ${nutrition_stats?.total_protein || 0}
        - Karbohidrat: ${nutrition_stats?.total_carbs || 0}
        - Lemak: ${nutrition_stats?.total_fat || 0}
        - Serat: ${nutrition_stats?.total_fiber || 0}
        - Gula: ${nutrition_stats?.total_sugar || 0}
        - Natrium: ${nutrition_stats?.total_sodium || 0}
        
        Tolong bantu saya membuat resep yang tidak hanya menggunakan bahan tersebut, tetapi juga membantu saya memenuhi kekurangan nutrisi ini.
        
        Balas dalam format JSON berikut:
        
        {
          "title": "...",
          "bahan": [
            {
              "name": "...",
              "quantity": ...,
              "unit": "..."
            }
          ],
          "langkah": ["..."],
          "gizi": {
            "calories": ...,
            "carbs": ...,
            "protein": ...,
            "fat": ...,
            "sugar": ...,
            "sodium": ...,
            "fiber": ...
          }
        }`;

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

    // Format data untuk disimpan ke database
    const recipeData = {
      title: parsedResult.title || "Resep AI",
      ingredients: parsedResult.bahan,
      steps: parsedResult.langkah,
      nutrition_info: {
        calories: parsedResult.gizi.calories,
        carbs: parsedResult.gizi.carbs,
        protein: parsedResult.gizi.protein,
        fat: parsedResult.gizi.fat,
        sugar: parsedResult.gizi.sugar,
        sodium: parsedResult.gizi.sodium,
        fiber: parsedResult.gizi.fiber,
      },
      Ai: true,
      tags: [cuisine, difficulty],
    };

    // Simpan ke database
    const Recipe = mongoose.model("Recipe");
    const newRecipe = new Recipe(recipeData);
    const savedRecipe = await newRecipe.save();

    res.json({
      result: parsedResult,
      recipeId: savedRecipe._id,
      message: "Recipe generated and saved successfully",
    });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Failed to generate recipe" });
  }
};

const deleteAccount = async (req, res) => {
  const userId = req.userId;

  try {
    console.log(userId);
    // Cari pengguna berdasarkan ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Pengguna tidak ditemukan" });
    }

    // Hapus akun pengguna
    await User.findByIdAndDelete(userId);

    res.status(200).json({ message: "Akun berhasil dihapus" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Terjadi kesalahan pada server", error: error.message });
  }
};

module.exports = { addConsumption, generateRecipe, deleteAccount };
