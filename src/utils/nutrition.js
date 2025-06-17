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

    const usdaNutrients = docs.map((d) => ({
      nutrient: d.Nutrient,
      value: +(d.Amount * (quantity / 100)).toFixed(2),
      unit: d.Unit,
      source: "USDA",
    }));

    // Deteksi apakah USDA mengandung nutrisi utama
    const usdaNutrientNames = usdaNutrients.map((n) => n.nutrient.toLowerCase());
    const containsMainNutrient = Object.keys(nutrientMap).every((key) => nutrientMap[key].some((alias) => usdaNutrientNames.some((name) => name.includes(alias))));

    let aiNutrients = [];

    // Hanya estimasi dari AI jika tidak ada nutrisi utama
    if (!containsMainNutrient) {
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

      aiNutrients = JSON.parse(estContent).map((n) => ({
        ...n,
        source: "AI",
      }));
    }

    // Gabungkan hasil USDA dan AI
    const combinedNutrients = [...usdaNutrients, ...aiNutrients];

    results.push({ name_en, quantity, unit, nutrients: combinedNutrients });
  }

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

  return {
    ingredients: results,
    nutrition_summary: nutritionInfo,
  };
};

module.exports = analyzeNutrition;
