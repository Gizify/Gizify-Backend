const express = require("express");
const userController = require("../controllers/userController");

const router = express.Router();

router.post("/add-consumption", userController.addConsumptionFromBarcode);
router.post("/consumption", userController.addConsumption);
router.post("/generate", userController.generateRecipe);

module.exports = router;
