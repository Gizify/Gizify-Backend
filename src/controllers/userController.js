const User = require("../models/User");
const FoodBarcode = require("../models/FoodBarcode");
const FoodNutrients = require("../models/FoodNutrient");
const { DateTime } = require("luxon");
const Recipe = require("../models/Recipe");
const axios = require("axios");
const mongoose = require("mongoose");
const analyzeNutrition = require("../utils/nutrition");
const UserRecipe = require("../models/UserRecipe");

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
        sodium: adjustedNutrition.sodium,
        folic_acid: adjustedNutrition.folic_acid,
        kalsium: adjustedNutrition.kalsium,
        vitamin_d: adjustedNutrition.vitamin_d,
        vitamin_b12: adjustedNutrition.vitamin_b12,
        vitamin_b6: adjustedNutrition.vitamin_b6,
        vitamin_c: adjustedNutrition.vitamin_c,
        vitamin_a: adjustedNutrition.vitamin_a,
        vitamin_e: adjustedNutrition.vitamin_e,
        zinc: adjustedNutrition.zinc,
        iodium: adjustedNutrition.iodium,
        water: adjustedNutrition.water,
        iron: adjustedNutrition.iron,
        magnesium: adjustedNutrition.magnesium,
        selenium: adjustedNutrition.selenium,
      });
    } else
      [
        "calories",
        "protein",
        "carbs",
        "fat",
        "fiber",
        "sugar",
        "sodium",
        "folic_acid",
        "kalsium",
        "vitamin_d",
        "vitamin_b12",
        "vitamin_b6",
        "vitamin_c",
        "vitamin_a",
        "vitamin_e",
        "zinc",
        "iodium",
        "water",
        "iron",
        "magnesium",
        "selenium",
      ].forEach((key) => {
        safeAdd(user.nutrition_stats[statsIndex], key, adjustedNutrition[key]);
      });

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
    vitamin_b6: safeMultiply(nutritionInfo?.vitamin_b6 ?? 0),
    vitamin_c: safeMultiply(nutritionInfo?.vitamin_c ?? 0),
    vitamin_e: safeMultiply(nutritionInfo?.vitamin_e ?? 0),
    vitamin_a: safeMultiply(nutritionInfo?.vitamin_a ?? 0),
    magnesium: safeMultiply(nutritionInfo?.magnesium ?? 0),
    selenium: safeMultiply(nutritionInfo?.selenium ?? 0),
    zinc: safeMultiply(nutritionInfo?.zinc ?? 0),
    iodium: safeMultiply(nutritionInfo?.iodium ?? 0),
    water: safeMultiply(nutritionInfo?.water ?? 0),
    iron: safeMultiply(nutritionInfo?.iron ?? 0),
  };
}

const getNutrition = async (req, res, next) => {
  try {
    const { title, ingredients } = req.body;

    if (!title || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ error: "Title and valid ingredients are required." });
    }

    // Jalankan analisis nutrisi
    const result = await analyzeNutrition(ingredients);

    // Buat dokumen baru
    const newRecipe = new UserRecipe({
      title,
      ingredients: result.ingredients,
      nutrition_info: result.nutrition_summary,
    });

    // Simpan ke database
    await newRecipe.save();

    res.status(201).json({
      message: "Recipe saved successfully.",
      data: newRecipe,
    });
  } catch (error) {
    console.error("Error analyzing or saving recipe:", error);
    res.status(500).json({ error: "Internal server error." });
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

// Generate resep dengan AI
const generateRecipe = async (req, res) => {
  const { ingredients, difficulty, cuisine, daily_nutrition_target, nutrition_stats = {} } = req.body;

  if (!ingredients || !difficulty || !cuisine || !daily_nutrition_target) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const prompt = `Saya adalah ibu hamil yang ingin membuat resep makanan dari bahan berikut: ${ingredients.join(", ")}.
      Tingkat kesulitan resep: ${difficulty}.
      Jenis masakan: ${cuisine}.

      Namun, saya telah mengonsumsi makanan berikut pada hari ini:
      - Kalori: ${nutrition_stats?.calories || 0} kkal
      - Protein: ${nutrition_stats?.protein || 0} g
      - Karbohidrat: ${nutrition_stats?.carbs || 0} g
      - Lemak: ${nutrition_stats?.fat || 0} g
      - Serat: ${nutrition_stats?.fiber || 0} g
      - Gula: ${nutrition_stats?.sugar || 0} g
      - Natrium: ${nutrition_stats?.sodium || 0} mg
      - Asam folat (Folic Acid): ${nutrition_stats?.folic_acid || 0} µg
      - Kalsium: ${nutrition_stats?.kalsium || 0} mg
      - Vitamin D: ${nutrition_stats?.vitamin_d || 0} mg
      - Vitamin B12: ${nutrition_stats?.vitamin_b12 || 0} mg
      - Vitamin C: ${nutrition_stats?.vitamin_c || 0} mg
      - Vitamin b6${nutrition_stats?.vitamin_b6 | 0} mg
      - Vitamin e:${nutrition_stats?.vitamin_e || 0} mg
      - Vitamin a: ${nutrition_stats?.vitamin_a || 0} mcg
      - Magnesium: ${nutrition_stats?.magnesium || 0}mg
      - Selenium: ${nutrition_stats?.selenium || 0}mg
      - Zat besi (Iron): ${nutrition_stats?.iron || 0} mg
      - Zinc: ${nutrition_stats?.zinc || 0} mg
      - Iodium: ${nutrition_stats?.iodium || 0} µg
      - Air: ${nutrition_stats?.water || 0} ml

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
    console.log(aiRaw);
    const jsonString = aiRaw.slice(aiRaw.indexOf("{"), aiRaw.lastIndexOf("}") + 1);
    const parsedResult = JSON.parse(jsonString);

    const ingredientListForAnalysis = parsedResult.bahan.map((item) => {
      return `${item.quantity} ${item.unit} ${item.name}`;
    });
    const nutritionData = await analyzeNutrition(ingredientListForAnalysis);
    const nutritionInfo = {
      ...nutritionData.nutrition_summary,
      date: new Date().toISOString(),
    };

    const recipeData = {
      title: parsedResult.title || "Resep AI",
      ingredients: parsedResult.bahan,
      steps: parsedResult.langkah,
      nutrition_info: nutritionInfo,
      Ai: true,
      tags: [cuisine, difficulty],
    };

    const Recipe = mongoose.model("Recipe");
    const savedRecipe = await new Recipe(recipeData).save();

    res.json({
      result: parsedResult,
      nutrition_analysis: nutritionData,
      recipeId: savedRecipe._id,
      message: "Recipe generated and saved successfully",
    });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Failed to generate recipe" });
  }
};

module.exports = { addConsumption, generateRecipe, deleteAccount, getNutrition };
