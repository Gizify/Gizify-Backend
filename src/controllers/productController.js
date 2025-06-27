const axios = require("axios");
const FoodBarcode = require("../models/FoodBarcode");

const scanProduct = async (req, res) => {
  const { barcode } = req.params;

  if (!barcode) {
    return res.status(400).json({ error: "Barcode is required" });
  }

  try {
    let cachedProduct = await FoodBarcode.findOne({ barcode });

    if (cachedProduct) {
      return res.json({
        name: cachedProduct.product_name,
        brand: cachedProduct.brand,
        nutrition: cachedProduct.nutrition_info,
        ingredients: cachedProduct.ingredients_list,
        packageSize: cachedProduct.package_size,
        servingSize: cachedProduct.serving_size,
        image: cachedProduct.image_url,
        barcode: cachedProduct.barcode,
        cache: true,
      });
    }

    const response = await axios.get(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);

    if (response.data.status === 1) {
      const product = response.data.product;
      const nutriments = product.nutriments || {};

      const packageSize = product.product_quantity || (product.quantity && parseFloat(product.quantity)) || null;
      const servingSize = product.serving_quantity ? parseFloat(product.serving_quantity) : null;

      const calculateNutrition = (per100g, value, unit) => {
        if (value && packageSize) {
          if (unit === "serving" && servingSize) {
            return (value / servingSize) * packageSize;
          }
          if (per100g) {
            return (value / 100) * packageSize;
          }
          return value;
        }
        return value || 0;
      };

      const nutrition_info = {
        calories: calculateNutrition(nutriments["energy-kcal_100g"], nutriments["energy-kcal"], nutriments["energy-kcal_unit"]),
        carbs: calculateNutrition(nutriments.carbohydrates_100g, nutriments.carbohydrates, nutriments.carbohydrates_unit),
        protein: calculateNutrition(nutriments.proteins_100g, nutriments.proteins, nutriments.proteins_unit),
        fat: calculateNutrition(nutriments.fat_100g, nutriments.fat, nutriments.fat_unit),
        sugar: calculateNutrition(nutriments.sugars_100g, nutriments.sugars, nutriments.sugars_unit),
        added_sugar: calculateNutrition(nutriments["added-sugars_100g"], nutriments["added-sugars"], nutriments["added-sugars_unit"]),
        fiber: calculateNutrition(nutriments.fiber_100g, nutriments.fiber, nutriments.fiber_unit),
        sodium: calculateNutrition(nutriments.sodium_100g, nutriments.sodium, nutriments.sodium_unit),
        folic_acid: calculateNutrition(nutriments["folic-acid_100g"], nutriments["folic-acid"], nutriments["folic-acid_unit"]),
        kalsium: calculateNutrition(nutriments["calcium_100g"], nutriments["calcium"], nutriments["calcium_unit"]),
        vitamin_d: calculateNutrition(nutriments["vitamin-d_100g"], nutriments["vitamin-d"], nutriments["vitamin-d_unit"]),
        vitamin_b12: calculateNutrition(nutriments["vitamin-b12_100g"], nutriments["vitamin-b12"], nutriments["vitamin-b12_unit"]),
        vitamin_b6: calculateNutrition(nutriments["vitamin-b6_100g"], nutriments["vitamin-b6"], nutriments["vitamin-b6_unit"]),
        vitamin_c: calculateNutrition(nutriments["vitamin-c_100g"], nutriments["vitamin-c"], nutriments["vitamin-c_unit"]),
        vitamin_a: calculateNutrition(nutriments["vitamin-a_100g"], nutriments["vitamin-a"], nutriments["vitamin-a_unit"]),
        vitamin_e: calculateNutrition(nutriments["vitamin-e_100g"], nutriments["vitamin-e"], nutriments["vitamin-e_unit"]),
        zinc: calculateNutrition(nutriments["zinc_100g"], nutriments["zinc"], nutriments["zinc_unit"]),
        iodium: calculateNutrition(nutriments["iodine_100g"], nutriments["iodine"], nutriments["iodine_unit"]),
        water: calculateNutrition(nutriments["water_100g"], nutriments["water"], nutriments["water_unit"]),
        iron: calculateNutrition(nutriments["iron_100g"], nutriments["iron"], nutriments["iron_unit"]),
        magnesium: calculateNutrition(nutriments["magnesium_100g"], nutriments["magnesium"], nutriments["magnesium_unit"]),
        selenium: calculateNutrition(nutriments["selenium_100g"], nutriments["selenium"], nutriments["selenium_unit"]),
      };

      const newFoodCache = new FoodBarcode({
        barcode: product.code,
        product_name: product.product_name,
        brand: product.brands,
        nutrition_info,
        ingredients_list: product.ingredients_text || [],
        package_size: packageSize,
        serving_size: servingSize,
        image: product.image_url,
        source: "Open Food Facts",
      });

      try {
        await newFoodCache.save();
        console.log("Produk berhasil disimpan:", product.code);
      } catch (err) {
        console.error("Gagal menyimpan produk:", err);
        if (err.code === 11000) {
          cachedProduct = await FoodBarcode.findOne({ barcode });
        } else {
          throw err;
        }
      }

      res.json({
        name: cachedProduct?.product_name || product.product_name,
        brand: cachedProduct?.brand || product.brands,
        nutrition: cachedProduct?.nutrition_info || nutrition_info,
        ingredients: cachedProduct?.ingredients_list || product.ingredients_text || [],
        packageSize: cachedProduct?.package_size || packageSize,
        servingSize: cachedProduct?.serving_size || servingSize,
        image: cachedProduct?.image_url || product.image_url,
        barcode: cachedProduct?.barcode || product.code,
        cache: !!cachedProduct,
        source: cachedProduct?.source || "Open Food Facts",
      });
    } else {
      res.status(404).json({ error: "Product not found in Open Food Facts database" });
    }
  } catch (error) {
    console.error("Error fetching product:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { scanProduct };
