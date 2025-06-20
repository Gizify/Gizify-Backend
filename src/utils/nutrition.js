const axios = require("axios");
const FoodNutrients = require("../models/FoodNutrient");

const analyzeNutrition = async (ingredients = []) => {
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

  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    throw new Error("ingredients must be a non-empty array");
  }

  const prompt1 = `
    You are a nutrition assistant. Given a list of food ingredients in Indonesian and natural language input, return a JSON array with the following fields:
    - name_en: corrected English name of the ingredient (match USDA standard)
    - name_id: corrected Indonesian name of the ingredient
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
    const { name_en, name_id, quantity, unit } = item;

    // Cari dari koleksi lokal (TKPI)
    const localDocs = await FoodNutrients.aggregate([
      {
        $match: {
          Food: { $regex: name_id, $options: "i" },
        },
      },
      {
        $addFields: {
          matchScore: {
            $subtract: [100, { $strLenCP: name_id }],
          },
        },
      },
      { $sort: { matchScore: -1 } },
      { $limit: 5 },
    ]);

    const tkpiNutrients = localDocs.map((d) => ({
      nutrient: d.Nutrient,
      value: +(d.Amount * (quantity / 100)).toFixed(2),
      unit: d.Unit,
      source: "TKPI",
    }));

    // Periksa apakah semua nutrisi utama sudah tersedia
    const foundKeys = new Set();
    for (const nutrient of tkpiNutrients) {
      const name = nutrient.nutrient.toLowerCase();
      for (const key in nutrientMap) {
        if (nutrientMap[key].some((alias) => name.includes(alias))) {
          foundKeys.add(key);
        }
      }
    }

    let usdaNutrients = [];
    const missingKeys = Object.keys(nutrientMap).filter((k) => !foundKeys.has(k));

    // Jika masih ada nutrisi utama yang belum tersedia, panggil USDA
    if (missingKeys.length > 0) {
      try {
        const usdaResp = await axios.get(`https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(name_en)}&pageSize=1&api_key=${process.env.USDA_KEY}`);

        const foodItem = usdaResp.data.foods?.[0];
        if (foodItem) {
          usdaNutrients = foodItem.foodNutrients.map((n) => ({
            nutrient: n.nutrientName,
            value: +(n.value * (quantity / 100)).toFixed(2),
            unit: n.unitName,
            source: "USDA",
          }));
        }
      } catch (err) {
        console.warn("USDA error:", err.message);
      }
    }

    const combinedNutrients = [...tkpiNutrients, ...usdaNutrients];
    results.push({ name: name_id, name_en, quantity, unit, nutrients: combinedNutrients });
  }

  // Gabungkan nutrisi untuk semua bahan
  const nutritionInfo = {};
  for (const key in nutrientMap) {
    let total = 0;
    let found = false;

    for (const ingredient of results) {
      for (const nutrient of ingredient.nutrients) {
        const name = nutrient.nutrient.toLowerCase();
        if (nutrientMap[key].some((alias) => name.includes(alias))) {
          total += Number(nutrient.value) || 0;
          found = true;
        }
      }
    }

    nutritionInfo[key] = found ? +total.toFixed(2) : "Data tidak tersedia";
  }

  nutritionInfo.date = new Date().toISOString();

  return {
    ingredients: results,
    nutrition_summary: nutritionInfo,
  };
};

module.exports = analyzeNutrition;
