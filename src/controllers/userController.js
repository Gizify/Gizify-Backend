const User = require("../models/User");
const FoodBarcode = require("../models/FoodBarcode");

const addConsumptionFromBarcode = async (req, res) => {
  try {
    const { userId } = req.body;
    const { barcode } = req.body;

    const foodItem = await FoodBarcode.findOne({ barcode });

    if (!foodItem) {
      return res.status(404).json({ message: "Makanan dengan barcode ini tidak ditemukan." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User tidak ditemukan" });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let todayStats = user.nutrition_stats.find((entry) => new Date(entry.date).getTime() === today.getTime());

    if (!todayStats) {
      todayStats = {
        date: today,
        total_calories: 0,
        total_protein: 0,
        total_carbs: 0,
        total_fat: 0,
        total_fiber: 0,
        total_sugar: 0,
        total_sodium: 0,
      };
      user.nutrition_stats.push(todayStats);
    }

    todayStats.total_calories += foodItem.nutrition_info.calories;
    todayStats.total_protein += foodItem.nutrition_info.protein;
    todayStats.total_carbs += foodItem.nutrition_info.carbs;
    todayStats.total_fat += foodItem.nutrition_info.fat;
    todayStats.total_fiber += foodItem.nutrition_info.fiber;
    todayStats.total_sugar += foodItem.nutrition_info.sugar;
    todayStats.total_sodium += foodItem.nutrition_info.sodium;

    await user.save();

    res.json({
      message: "Konsumsi berhasil ditambahkan",
      today_stats: todayStats,
    });
  } catch (err) {
    console.error("Error menambahkan konsumsi:", err);
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

module.exports = { addConsumptionFromBarcode };
