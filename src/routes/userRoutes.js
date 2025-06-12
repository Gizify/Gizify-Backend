const express = require("express");
const userController = require("../controllers/userController");

const router = express.Router();

router.post("/consumption", userController.addConsumption);
router.post("/generate", userController.generateRecipe);
router.post("/analyst", userController.getNutrition);
router.delete("/delete", userController.deleteAccount);

module.exports = router;
