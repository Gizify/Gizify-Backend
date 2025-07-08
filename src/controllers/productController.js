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
        if (!value) return 0;

        // Jika satuannya bukan per 100g atau per serving, asumsikan nilainya sudah benar
        if (unit && unit !== "g" && unit !== "mg" && unit !== "µg" && unit !== "kcal") {
          return Math.round(value * 100) / 100;
        }

        // Konversi per 100g → total berdasarkan packageSize
        if (per100g && packageSize) {
          return Math.round((value / 100) * packageSize * 100) / 100;
        }

        return Math.round(value * 100) / 100;
      };

      const getNutrientValue = (key) => {
        return nutriments[`${key}_serving`] ?? nutriments[key] ?? 0;
      };

      const nutrition_info = {
        calories: Math.round(getNutrientValue("energy-kcal")),
        carbs: Math.round(getNutrientValue("carbohydrates") * 10) / 10,
        protein: Math.round(getNutrientValue("proteins") * 10) / 10,
        fat: Math.round(getNutrientValue("fat") * 10) / 10,
        sugar: Math.round(getNutrientValue("sugars") * 10) / 10,
        added_sugar: Math.round(getNutrientValue("added-sugars") * 10) / 10,
        fiber: Math.round(getNutrientValue("fiber") * 10) / 10,
        sodium: Math.round(getNutrientValue("sodium") * 10) / 10,
        folic_acid: Math.round(getNutrientValue("folic-acid") * 10) / 10,
        kalsium: Math.round(getNutrientValue("calcium") * 10) / 10,
        vitamin_d: Math.round(getNutrientValue("vitamin-d") * 10) / 10,
        vitamin_b12: Math.round(getNutrientValue("vitamin-b12") * 10) / 10,
        vitamin_b6: Math.round(getNutrientValue("vitamin-b6") * 10) / 10,
        vitamin_c: Math.round(getNutrientValue("vitamin-c") * 10) / 10,
        vitamin_a: Math.round(getNutrientValue("vitamin-a") * 10) / 10,
        vitamin_e: Math.round(getNutrientValue("vitamin-e") * 10) / 10,
        zinc: Math.round(getNutrientValue("zinc") * 10) / 10,
        iodium: Math.round(getNutrientValue("iodine") * 10) / 10,
        water: Math.round(getNutrientValue("water") * 10) / 10,
        iron: Math.round(getNutrientValue("iron") * 10) / 10,
        magnesium: Math.round(getNutrientValue("magnesium") * 10) / 10,
        selenium: Math.round(getNutrientValue("selenium") * 10) / 10,
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
