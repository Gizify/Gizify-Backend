// Import Axios for making HTTP requests
const axios = require("axios");

// Import the FoodBarcode model from MongoDB
const FoodBarcode = require("../models/FoodBarcode");

// Controller function to handle barcode scanning and product retrieval
const scanProduct = async (req, res) => {
  const { barcode } = req.params;

  // Validate that barcode is provided
  if (!barcode) {
    return res.status(400).json({ error: "Barcode is required" });
  }

  try {
    // Check if product already exists in local MongoDB cache
    let cachedProduct = await FoodBarcode.findOne({ barcode });

    // If product is found in cache, return cached data
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
        cache: true, // Indicate this data is from cache
      });
    }

    // Fetch product data from Open Food Facts API
    const response = await axios.get(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);

    // If product is found in Open Food Facts
    if (response.data.status === 1) {
      const product = response.data.product;
      const nutriments = product.nutriments || {};

      // Get package and serving sizes with fallback options
      const packageSize = product.product_quantity || (product.quantity && parseFloat(product.quantity)) || null;
      const servingSize = product.serving_quantity ? parseFloat(product.serving_quantity) : null;

      // Function to calculate nutritional values based on available units and sizes
      const calculateNutrition = (per100g, value, unit) => {
        if (!value) return 0;

        // If unit is not common, assume value is already accurate
        if (unit && unit !== "g" && unit !== "mg" && unit !== "µg" && unit !== "kcal") {
          return Math.round(value * 100) / 100;
        }

        // Convert value from per 100g to total based on package size
        if (per100g && packageSize) {
          return Math.round((value / 100) * packageSize * 100) / 100;
        }

        return Math.round(value * 100) / 100;
      };

      // Utility to retrieve nutrient value, prioritize per serving if available
      const getNutrientValue = (key) => {
        return nutriments[`${key}_serving`] ?? nutriments[key] ?? 0;
      };

      // Map of nutrition values with rounding applied for cleaner display
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

      // Create new cache entry in MongoDB
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
        // Try saving the new product to the database
        await newFoodCache.save();
        console.log("Product saved successfully:", product.code);
      } catch (err) {
        console.error("Failed to save product:", err);

        // Handle duplicate barcode case
        if (err.code === 11000) {
          cachedProduct = await FoodBarcode.findOne({ barcode });
        } else {
          throw err; // Rethrow unknown errors
        }
      }

      // Send back the product data, whether from fresh API call or fallback to cache
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
      // If product is not found in Open Food Facts
      res.status(404).json({ error: "Product not found in Open Food Facts database" });
    }
  } catch (error) {
    // Handle unexpected errors and log them
    console.error("Error fetching product:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Export the scanProduct controller to be used in routes
module.exports = { scanProduct };