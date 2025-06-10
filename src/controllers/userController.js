const User = require("../models/User");
const FoodBarcode = require("../models/FoodBarcode");
const { DateTime } = require("luxon");
const Recipe = require("../models/Recipe");
const axios = require("axios");
const mongoose = require("mongoose");

function safeAdd(target, key, value) {
  target[key] = (target[key] || 0) + (value || 0);
}

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
      return entryDate.toISODate() === userToday.toISODate();
    });

    if (statsIndex === -1) {
      user.nutrition_stats.push({
        date: todayStart,
        calories: adjustedNutrition.calories,
        protein: adjustedNutrition.protein,
        carbs: adjustedNutrition.carbs,
        fat: adjustedNutrition.fat,
        fiber: adjustedNutrition.fiber,
        sugar: adjustedNutrition.sugar,
        folic_acid: adjustedNutrition.folic_acid,
        vitamin_d: adjustedNutrition.vitamin_d,
        vitamin_b12: adjustedNutrition.vitamin_b12,
        vitamin_c: adjustedNutrition.vitamin_c,
        zinc: adjustedNutrition.zinc,
        iodium: adjustedNutrition.iodium,
        water: adjustedNutrition.water,
        iron: adjustedNutrition.iron,
      });
    } else {
      ["calories", "protein", "carbs", "fat", "fiber", "sugar", "sodium", "folic_acid", "kalsium", "vitamin_d", "vitamin_b12", "vitamin_c", "zinc", "iodium", "water", "iron"].forEach((key) => {
        safeAdd(user.nutrition_stats[statsIndex], key, adjustedNutrition[key]);
      });
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
  const safeMultiply = (value) => {
    const number = Number(value);
    return isNaN(number) ? 0 : number * portion_size;
  };

  return {
    calories: safeMultiply(nutritionInfo?.calories ?? 0),
    protein: safeMultiply(nutritionInfo?.protein ?? 0),
    carbs: safeMultiply(nutritionInfo?.carbs ?? 0),
    fat: safeMultiply(nutritionInfo?.fat ?? 0),
    fiber: safeMultiply(nutritionInfo?.fiber ?? 0),
    sugar: safeMultiply(nutritionInfo?.sugar ?? 0),
    sodium: safeMultiply(nutritionInfo?.sodium ?? 0),
    folic_acid: safeMultiply(nutritionInfo?.folic_acid ?? 0),
    kalsium: safeMultiply(nutritionInfo?.kalsium ?? 0),
    vitamin_d: safeMultiply(nutritionInfo?.vitamin_d ?? 0),
    vitamin_b12: safeMultiply(nutritionInfo?.vitamin_b12 ?? 0),
    vitamin_c: safeMultiply(nutritionInfo?.vitamin_c ?? 0),
    zinc: safeMultiply(nutritionInfo?.zinc ?? 0),
    iodium: safeMultiply(nutritionInfo?.iodium ?? 0),
    water: safeMultiply(nutritionInfo?.water ?? 0),
    iron: safeMultiply(nutritionInfo?.iron ?? 0),
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
    const prompt = `Saya adalah ibu hamil yang ingin membuat resep makanan dari bahan berikut: ${ingredients.join(", ")}.
      Tingkat kesulitan resep: ${difficulty}.
      Jenis masakan: ${cuisine}.

      Berikut adalah target kebutuhan nutrisi harian saya selama kehamilan:
      - Kalori: ${daily_nutrition_target.calories} kkal
      - Protein: ${daily_nutrition_target.protein} g
      - Karbohidrat: ${daily_nutrition_target.carbs} g
      - Lemak: ${daily_nutrition_target.fat} g
      - Serat: ${daily_nutrition_target.fiber} g
      - Gula: ${daily_nutrition_target.sugar} g
      - Natrium: ${daily_nutrition_target.sodium} mg
      - Asam folat (Folic Acid): ${daily_nutrition_target.folic_acid} µg
      - Kalsium: ${daily_nutrition_target.kalsium} mg
      - Vitamin D: ${daily_nutrition_target.vitamin_d} µg
      - Vitamin B12: ${daily_nutrition_target.vitamin_b12} µg
      - Vitamin C: ${daily_nutrition_target.vitamin_c} mg
      - Zat besi (Iron): ${daily_nutrition_target.iron} mg
      - Zinc: ${daily_nutrition_target.zinc} mg
      - Iodium: ${daily_nutrition_target.iodium} µg
      - Air: ${daily_nutrition_target.water} ml

      Namun, saya telah mengonsumsi makanan berikut pada hari ini:
      - Kalori: ${nutrition_stats?.total_calories || 0} kkal
      - Protein: ${nutrition_stats?.total_protein || 0} g
      - Karbohidrat: ${nutrition_stats?.total_carbs || 0} g
      - Lemak: ${nutrition_stats?.total_fat || 0} g
      - Serat: ${nutrition_stats?.total_fiber || 0} g
      - Gula: ${nutrition_stats?.total_sugar || 0} g
      - Natrium: ${nutrition_stats?.total_sodium || 0} mg
      - Asam folat (Folic Acid): ${nutrition_stats?.total_folic_acid || 0} µg
      - Kalsium: ${nutrition_stats?.total_kalsium || 0} mg
      - Vitamin D: ${nutrition_stats?.total_vitamin_d || 0} µg
      - Vitamin B12: ${nutrition_stats?.total_vitamin_b12 || 0} µg
      - Vitamin C: ${nutrition_stats?.total_vitamin_c || 0} mg
      - Zat besi (Iron): ${nutrition_stats?.total_iron || 0} mg
      - Zinc: ${nutrition_stats?.total_zinc || 0} mg
      - Iodium: ${nutrition_stats?.total_iodium || 0} µg
      - Air: ${nutrition_stats?.total_water || 0} ml

      Tolong bantu saya membuat resep yang menggunakan bahan-bahan tersebut dan membantu saya memenuhi kekurangan nutrisi harian saya sebagai ibu hamil.

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
          "protein": ...,
          "carbs": ...,
          "fat": ...,
          "fiber": ...,
          "sugar": ...,
          "sodium": ...,
          "folic_acid": ...,
          "kalsium": ...,
          "vitamin_d": ...,
          "vitamin_b12": ...,
          "vitamin_c": ...,
          "zinc": ...,
          "iodium": ...,
          "iron": ...,
          "water": ...
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
