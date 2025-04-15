const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");

router.get("/scan/:barcode", productController.scanProduct);

module.exports = router;
