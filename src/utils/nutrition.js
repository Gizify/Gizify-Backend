const axios = require("axios");
const FoodNutrients = require("../models/FoodNutrient");
const stringSimilarity = require("string-similarity");

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
    vitamin_b6: ["vitamin b6"],
    vitamin_c: ["vitamin c", "ascorbic acid"],
    vitamin_a: ["vitamin a", "retinol", "beta-carotene"],
    vitamin_e: ["vitamin e", "alpha-tocopherol"],
    zinc: ["zinc"],
    iodium: ["iodine", "iodium"],
    water: ["water", "moisture"],
    iron: ["iron", "ferrous", "ferric"],
    magnesium: ["magnesium"],
    selenium: ["selenium"],
  };

  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    throw new Error("ingredients must be a non-empty array");
  }

  const prompt1 = `
You are a professional nutrition data assistant. You will receive a list of food ingredients written in Indonesian and natural language.

Your task is to convert them into a structured JSON array with corrected and standardized fields. Focus on finding the most specific USDA-compatible English food name (as used in the USDA FoodData Central database).

Return each item with the following fields:
- name_en: specific, corrected English name of the ingredient (must be suitable for searching in USDA database — avoid generic terms).
- name_id: corrected Indonesian name of the ingredient.
- quantity: numeric value only (converted if needed, no unit).
- unit: either "g" for solid or "ml" for liquid (convert informal units like sdm, sdt, piring, gelas, potong, butir).

Examples of good name_en values:
- Use "Spinach, raw" instead of just "spinach"
- Use "Garlic, raw" instead of "garlic"
- Use "Oil, vegetable" instead of "cooking oil"
- Use "Shallots, raw" instead of "shallots"

Only output a valid JSON array like this:
[
  {
    "name_en": "Spinach, raw",
    "name_id": "bayam",
    "quantity": 200,
    "unit": "g"
  },
  {
    "name_en": "Garlic, raw",
    "name_id": "bawang putih",
    "quantity": 5,
    "unit": "g"
  }
]

Input:
${ingredients.map((i) => `- ${i}`).join("\n")}

ONLY output the final JSON. Do not explain or add anything else.
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

    const localDocs = await FoodNutrients.aggregate([{ $match: { Food: { $regex: name_id, $options: "i" } } }, { $addFields: { matchScore: { $subtract: [100, { $strLenCP: name_id }] } } }, { $sort: { matchScore: -1 } }, { $limit: 5 }]);

    const isMainNutrient = (nutrientName) => {
      const lower = nutrientName.toLowerCase();
      return Object.values(nutrientMap).some((aliases) => aliases.some((alias) => lower.includes(alias)));
    };

    const deduplicate = (nutrients) => {
      const seen = new Set();
      const unique = [];

      for (const n of nutrients) {
        const key = Object.entries(nutrientMap).find(([mainKey, aliases]) => aliases.some((alias) => n.nutrient.toLowerCase().includes(alias)))?.[0];

        if (key && !seen.has(key)) {
          seen.add(key);
          unique.push({ ...n, mappedKey: key });
        }
      }

      return unique;
    };

    const tkpiNutrients = deduplicate(
      localDocs
        .map((d) => ({
          nutrient: d.Nutrient,
          value: +(d.Amount * (quantity / 100)).toFixed(2),
          unit: d.Unit,
          source: "TKPI",
        }))
        .filter((n) => isMainNutrient(n.nutrient))
    );

    let usdaNutrients = [];
    let usda_name = "";

    if (tkpiNutrients.length === 0) {
      try {
        const usdaResp = await axios.get(`https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(name_en)}&pageSize=50&api_key=${process.env.USDA_KEY}`);

        const foods = usdaResp.data.foods || [];

        const normalize = (str) =>
          str
            .toLowerCase()
            .replace(/[^\w\s]/gi, "")
            .trim();

        const bestMatch = foods
          .map((item) => {
            const score = stringSimilarity.compareTwoStrings(normalize(name_en), normalize(item.description));
            return { ...item, similarity: score };
          })
          .sort((a, b) => b.similarity - a.similarity)[0];

        if (!bestMatch || bestMatch.similarity < 0.8) {
          console.log(`❌ USDA match untuk "${name_en}" diabaikan karena similarity ${bestMatch?.similarity ?? 0}`);
        } else {
          usdaNutrients = deduplicate(
            bestMatch.foodNutrients
              .map((n) => ({
                nutrient: n.nutrientName,
                value: +(n.value * (quantity / 100)).toFixed(2),
                unit: n.unitName,
                source: "USDA",
              }))
              .filter((n) => isMainNutrient(n.nutrient))
          );

          usda_name = bestMatch.description;
        }
      } catch (err) {
        console.warn("USDA error:", err.message);
      }
    }

    const combinedNutrients = tkpiNutrients.length > 0 ? tkpiNutrients : usdaNutrients;

    results.push({
      name: name_id,
      name_en: usda_name,
      quantity,
      unit,
      nutrients: combinedNutrients,
    });
  }

  const nutritionInfo = {};
  for (const key in nutrientMap) {
    let total = 0;
    let found = false;

    for (const ingredient of results) {
      for (const nutrient of ingredient.nutrients) {
        if (nutrient.mappedKey === key) {
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
