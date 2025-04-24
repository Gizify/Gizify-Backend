const axios = require("axios");
const FoodBarcode = require("../models/FoodBarcode"); // Model untuk cache makanan

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

      const packageSize = product.product_quantity || (product.quantity && parseFloat(product.quantity)) || null;
      const servingSize = product.serving_quantity ? parseFloat(product.serving_quantity) : null;

      const calculateNutrition = (nutrientPer100, nutrientValue, nutrientUnit) => {
        if (nutrientValue && packageSize) {
          if (nutrientUnit === "serving" && servingSize) {
            return (nutrientValue / servingSize) * packageSize;
          }

          if (nutrientPer100) {
            return (nutrientValue / 100) * packageSize;
          }

          return nutrientValue;
        }

        return nutrientValue;
      };

      const nutriments = product.nutriments || {};

      const nutrition_info = {
        calories: calculateNutrition(nutriments["energy-kcal_100g"], nutriments["energy-kcal"], nutriments["energy-kcal_unit"]),
        carbs: calculateNutrition(nutriments.carbohydrates_100g, nutriments.carbohydrates, nutriments.carbohydrates_unit),
        protein: calculateNutrition(nutriments.proteins_100g, nutriments.proteins, nutriments.proteins_unit),
        fat: calculateNutrition(nutriments.fat_100g, nutriments.fat, nutriments.fat_unit),
        sugar: calculateNutrition(nutriments.sugars_100g, nutriments.sugars, nutriments.sugars_unit),
        sodium: calculateNutrition(nutriments.sodium_100g, nutriments.sodium, nutriments.sodium_unit),
        fiber: calculateNutrition(nutriments.fiber_100g, nutriments.fiber, nutriments.fiber_unit),
      };

      const newFoodCache = new FoodBarcode({
        barcode: product.code,
        product_name: product.product_name,
        brand: product.brands,
        nutrition_info: nutrition_info,
        ingredients_list: product.ingredients_text || [],
        package_size: packageSize,
        serving_size: servingSize,
        image: product.image_url,
      });

      try {
        await newFoodCache.save();
      } catch (err) {
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
