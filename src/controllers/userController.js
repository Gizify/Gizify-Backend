const User = require("../models/User");
const FoodBarcode = require("../models/FoodBarcode");
const FoodNutrients = require("../models/FoodNutrient");
const { DateTime } = require("luxon");
const Recipe = require("../models/Recipe");
const axios = require("axios");
const mongoose = require("mongoose");
const analyzeNutrition = require("../utils/nutrition");

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

const getNutrition = async (req, res, next) => {
  try {
    const { ingredients } = req.body;
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ error: "ingredients must be a non-empty array" });
    }

    const prompt1 = `
      You are a nutrition assistant. Given a list of food ingredients in Indonesian and natural language input, return a JSON array with the following fields:
      - name_en: corrected English name of the ingredient (match USDA standard)
      - quantity: numeric amount
      - unit: "g" or "ml" (converted from input like sdm, piring, gelas)

      Input:
      ${ingredients.map((i) => `- ${i}`).join("\n")}

      Output ONLY valid JSON array.
      `;

    const stdResp = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: prompt1 },
        ],
        temperature: 0.2,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.AI_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    let content = stdResp.data.choices[0].message.content;
    content = content.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(content);

    const results = [];

    for (const item of parsed) {
      const { name_en, quantity, unit } = item;

      const docs = await FoodNutrients.aggregate([
        {
          $match: {
            Food: { $regex: name_en, $options: "i" },
          },
        },
        {
          $addFields: {
            matchScore: {
              $subtract: [100, { $strLenCP: name_en }],
            },
          },
        },
        { $sort: { matchScore: -1 } },
        { $limit: 5 },
      ]);

      if (docs.length) {
        const factor = quantity / 100;
        const nutrients = docs.map((d) => ({
          nutrient: d.Nutrient,
          value: +(d.Amount * factor).toFixed(2),
          unit: d.Unit,
          source: "USDA",
        }));
        results.push({ name_en, quantity, unit, nutrients });
      } else {
        const estPrompt = `
Estimate nutrition for ${quantity}${unit} of ${name_en}.
Return JSON array with: nutrient, value, unit.
only JSON NO MORE JUST JSON!!!
`;

        const estResp = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
            model: "gpt-4o",
            messages: [
              { role: "system", content: "You are a nutrition expert." },
              { role: "user", content: estPrompt },
            ],
            temperature: 0.2,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.AI_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );

        let estContent = estResp.data.choices[0].message.content;
        estContent = estContent.replace(/```json|```/g, "").trim();

        const estNutrients = JSON.parse(estContent);
        const nutrients = estNutrients.map((n) => ({
          ...n,
          source: "AI",
        }));

        results.push({ name_en, quantity, unit, nutrients });
      }
    }

    // === AGREGASI KE DALAM NutritionInfoSchema ===
    const nutrientMap = {
      calories: ["energy", "calories", "kcal"],
      protein: ["protein"],
      carbs: ["carbohydrate", "carbs"],
      fat: ["fat", "total fat"],
      fiber: ["fiber", "dietary fiber"],
      sugar: ["sugar", "sugars"],
      sodium: ["sodium", "salt"],
      folic_acid: ["folic acid", "folate"],
      kalsium: ["calcium", "kalsium"],
      vitamin_d: ["vitamin d"],
      vitamin_b12: ["vitamin b12"],
      vitamin_c: ["vitamin c", "ascorbic acid"],
      zinc: ["zinc"],
      iodium: ["iodine", "iodium"],
      water: ["water", "moisture"],
      iron: ["iron"],
    };

    const nutritionInfo = Object.keys(nutrientMap).reduce((obj, key) => {
      obj[key] = 0;
      return obj;
    }, {});

    for (const ingredient of results) {
      for (const nutrient of ingredient.nutrients) {
        const name = nutrient.nutrient.toLowerCase();
        const value = Number(nutrient.value) || 0;
        for (const key in nutrientMap) {
          if (nutrientMap[key].some((alias) => name.includes(alias))) {
            nutritionInfo[key] += value;
            break;
          }
        }
      }
    }

    nutritionInfo.date = new Date().toISOString();

    res.json({
      ingredients: results,
      nutrition_summary: nutritionInfo,
    });
  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
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
