const express = require("express");
const userController = require("../controllers/userController");

const router = express.Router();

router.post("/add-consumption", userController.addConsumptionFromBarcode);

module.exports = router;
