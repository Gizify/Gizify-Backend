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
        cache: true,
      });
    }

    const response = await axios.get(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);

    if (response.data.status === 1) {
      const product = response.data.product;

      const newFoodCache = new FoodBarcode({
        barcode: product.code,
        product_name: product.product_name,
        brand: product.brands,
        nutrition_info: {
          calories: product.nutriments?.energy_kcal,
          carbs: product.nutriments?.carbohydrates,
          protein: product.nutriments?.proteins,
          fat: product.nutriments?.fat,
          sugar: product.nutriments?.sugars,
          sodium: product.nutriments?.sodium,
          fiber: product.nutriments?.fiber,
        },
        ingredients_list: product.ingredients_text || [],
      });

      await newFoodCache.save();
      I;
      res.json({
        name: product.product_name,
        brand: product.brands,
        nutrition: newFoodCache.nutrition_info,
        ingredients: newFoodCache.ingredients_list,
        cache: false,
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
