const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");

router.post("/regis", authController.registerUser);
router.post("/complete-data", authMiddleware, authController.completeUserProfile);
router.post("/login", authController.loginUser);

module.exports = router;
