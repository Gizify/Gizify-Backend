const express = require("express");
const router = express.Router();
const foodBarcodeController = require("../controllers/adminController");

// Create a new food barcode entry
router.post("/food-barcodes", foodBarcodeController.createFoodBarcode);

// Get all food barcode entries
router.get("/food-barcodes", foodBarcodeController.getAllFoodBarcodes);

// Get a single food barcode by barcode number
router.get("/food-barcodes/:barcode", foodBarcodeController.getFoodBarcodeByBarcode);

// Update a food barcode entry
router.put("/food-barcodes/:barcode", foodBarcodeController.updateFoodBarcode);
router.patch("/food-barcodes/:barcode", foodBarcodeController.updateFoodBarcode); // Alternative for partial updates

// Delete a food barcode entry
router.delete("/food-barcodes/:barcode", foodBarcodeController.deleteFoodBarcode);

module.exports = router;
