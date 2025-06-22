const axios = require("axios");
const FoodNutrients = require("../models/FoodNutrient");
const stringSimilarity = require("string-similarity");

const analyzeNutrition = async (ingredients = []) => {
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    throw new Error("ingredients must be a non-empty array");
  }

  const nutrientMap = {
    calories: ["energy", "calories", "kcal"],
    protein: ["protein"],
    carbs: ["carbohydrate", "carbs"],
    fat: ["fat", "total fat"],
    fiber: ["fiber", "dietary fiber"],
    sugar: ["sugar", "sugars", "total sugars"],
    added_sugar: ["added sugar", "sugars, added"],
    sodium: ["sodium", "salt"],
    folic_acid: ["folic acid", "folate"],
    kalsium: ["calcium", "kalsium"],
    vitamin_d: ["vitamin d"],
    vitamin_b12: ["vitamin b12"],
    vitamin_b6: ["vitamin b6"],
    vitamin_c: ["vitamin c", "ascorbic acid"],
    vitamin_a: ["vitamin a", "retinol", "beta-carotene"],
    vitamin_e: ["vitamin e", "alpha-tocopherol", "vitamin e, added"],
    zinc: ["zinc"],
    iodium: ["iodine", "iodium"],
    iron: ["iron", "ferrous", "ferric"],
    magnesium: ["magnesium"],
    selenium: ["selenium"],
    water: ["water", "moisture"],
  };

  const isMainNutrient = (nutrientName) => {
    const lower = nutrientName.toLowerCase();
    return Object.values(nutrientMap).some((aliases) => aliases.some((alias) => lower.includes(alias)));
  };

  const normalizeUnitAndConvert = (n) => {
    let unit = n.unit.toLowerCase();
    unit = unit.replace("ug", "µg").replace("iu", "iu").replace("kj", "kcal");

    let value = Number(n.value) || 0;
    if (n.unit.toLowerCase() === "kj") {
      value = +(value / 4.184).toFixed(2);
      unit = "kcal";
    }

    return { ...n, value, unit };
  };

  const deduplicate = (nutrients) => {
    const result = {};
    for (const n of nutrients) {
      const key = Object.entries(nutrientMap).find(([mainKey, aliases]) => aliases.some((alias) => n.nutrient.toLowerCase().includes(alias)))?.[0];
      if (!key) continue;

      const cleaned = normalizeUnitAndConvert(n);
      if (!result[key]) {
        result[key] = { ...cleaned, mappedKey: key };
      } else {
        result[key].value = +(result[key].value + cleaned.value).toFixed(2);
      }
    }
    return Object.values(result);
  };

  const prompt1 = `
Anda adalah spesialis USDA FoodData Central yang ketat. Tugas Anda adalah mengkonversi bahan makanan dalam bahasa Indonesia menjadi nama USDA standar yang EKSAK.

**ATURAN UTAMA:**
1. Untuk \`name_en\`:
   - HARUS menggunakan deskripsi persis dari USDA FoodData Central
   - URUTAN deskriptor: [Jenis Hewan] > [Gaya Persiapan] > [Bagian] > [Pemrosesan] > [Metode Masak]
   - Contoh: "Chicken, broilers or fryers, breast, meat only, raw"
   - Jika bahan tidak spesifik, gunakan default:
        * "ayam" → "Chicken, broiler or fryers, breast, meat only, raw"
        * "ikan" → "Fish, salmon, Atlantic, farmed, raw"

2. Untuk \`name_id\`:
   - Gunakan istilah Indonesia baku (contoh: "bawang putih" bukan "bawmer")

3. Konversi satuan:
   - Gunakan tabel konversi ini:
        * sdm (tbsp): 
            - Madu: 21g
            - Minyak: 14ml
            - Lainnya: 15g/ml
        * sdt (tsp): 5g/ml
        * butir/buah: 
            - Telur: 50g
            - Daging: 100g
            - Tahu: 80g
        * gelas (cup):
            - Cairan: 240ml
            - Nasi: 180g
            - Tepung: 120g

4. Format output:
   - HANYA output JSON array valid
   - Unit HANYA "g" atau "ml"

**TANGANI KASUS KHUSUS:**
- Untuk bahan lokal (tempe): 
  "name_en": "Soybean, fermented, cooked"
- Jika tidak ada padanan USDA: 
  "name_en": "UNKNOWN",
  "name_id": "[nama asli] (ASSUMED)"

Input:
${ingredients.map((i) => `- ${i}`).join("\n")}
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
  let parsed = JSON.parse(content);
  if (!Array.isArray(parsed)) parsed = [parsed];

  const results = [];

  for (const item of parsed) {
    const { name_en, name_id, quantity, unit } = item;

    const localDocs = await FoodNutrients.aggregate([{ $match: { Food: { $regex: name_id, $options: "i" } } }, { $addFields: { matchScore: { $subtract: [100, { $strLenCP: name_id }] } } }, { $sort: { matchScore: -1 } }, { $limit: 5 }]);

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
          .map((f) => ({
            ...f,
            similarity: stringSimilarity.compareTwoStrings(normalize(name_en), normalize(f.description)),
          }))
          .sort((a, b) => b.similarity - a.similarity)[0];

        if (bestMatch?.similarity >= 0.8) {
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
        } else {
          console.warn(`❌ USDA match for "${name_en}" rejected (sim < 0.8)`);
        }
      } catch (err) {
        console.warn("USDA fetch error:", err.message);
      }
    }

    results.push({
      name: name_id,
      name_en: usda_name || name_en,
      quantity,
      unit,
      nutrients: tkpiNutrients.length > 0 ? tkpiNutrients : usdaNutrients,
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
