const axios = require("axios");

const scanProduct = async (req, res) => {
  const { barcode } = req.params;

  if (!barcode) {
    return res.status(400).json({ error: "Barcode is required" });
  }

  try {
    const response = await axios.get(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);

    if (response.data.status === 1) {
      const product = response.data.product;
      res.json({
        name: product.product_name,
        brand: product.brands,
        quantity: product.quantity,
        image: product.image_url,
        nutrition: product.nutriments,
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
