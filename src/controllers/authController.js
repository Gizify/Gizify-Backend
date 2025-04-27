const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const dotenv = require("dotenv");

dotenv.config();

function calculateDailyNutritionTarget({ gender, weight, height, birthdate, activity_level, goal }) {
  const age = new Date().getFullYear() - new Date(birthdate).getFullYear();

  let bmr;
  if (gender === "Laki-Laki") {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }

  const activityFactorMap = {
    ringan: 1.375,
    sedang: 1.55,
    berat: 1.725,
  };

  const activityFactor = activityFactorMap[activity_level] || 1.2;
  let calories = bmr * activityFactor;

  if (goal === "gain") {
    calories += 300;
  }

  const protein = (calories * 0.2) / 4;
  const fat = (calories * 0.25) / 9;
  const carbs = (calories * 0.55) / 4;

  return {
    calories: Math.round(calories),
    protein: Math.round(protein),
    fat: Math.round(fat),
    carbs: Math.round(carbs),
    fiber: 30,
    sugar: 36,
    sodium: 2300,
  };
}

// Registrasi Pengguna
const registerUser = async (req, res) => {
  const { email, password, name } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "Email sudah terdaftar!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      passwordHash: hashedPassword,
    });

    await newUser.save();

    const user = {
      name,
      email,
    };

    // Atur token expire 7 hari
    const expiresInSeconds = 7 * 24 * 60 * 60;
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: expiresInSeconds });

    // Hitung expiredAt dalam milisecond
    const expiredAt = Date.now() + expiresInSeconds * 1000;

    res.status(201).json({ message: "Registrasi berhasil!", token, user, expiredAt });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
};

// lengkapi data pengguna
const completeUserProfile = async (req, res) => {
  const { userId } = req;
  const { height, weight, gender, activity, goal, birthdate, photoOption } = req.body;

  try {
    const nutritionTarget = calculateDailyNutritionTarget({
      gender,
      weight,
      height,
      birthdate,
      activity_level: activity,
      goal,
    });

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        birthdate,
        gender,
        height,
        weight,
        goal,
        activity_level: activity,
        daily_nutrition_target: nutritionTarget,
        photoOption,
      },
      { new: true }
    );

    res.status(200).json({ message: "Profil berhasil dilengkapi!", user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal melengkapi data profil." });
  }
};

// Login Pengguna
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Pengguna tidak ditemukan." });
    }

    // Verifikasi password
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return res.status(401).json({ message: "Password salah." });
    }

    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      height: user.height,
      weight: user.weight,
      gender: user.gender,
      goal: user.goal,
      activity_level: user.activity_level,
      birthdate: user.birthdate,
      photoOption: user.photoOption,
      daily_nutrition_target: user.daily_nutrition_target,
      nutrition_stats: user.nutrition_stats,
      meal_logs: user.meal_logs,
    };

    // Atur token expire 7 hari
    const expiresInSeconds = 7 * 24 * 60 * 60;
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: expiresInSeconds });

    // Hitung expiredAt dalam milisecond
    const expiredAt = Date.now() + expiresInSeconds * 1000;

    res.json({
      message: "Login berhasil!",
      token,
      expiredAt,
      user: userData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
};

// Update Data Pengguna
const updateUserData = async (req, res) => {
  const { userId } = req.params;
  const { height, weight, gender, activity, goal, birthdate, photoOption } = req.body;

  try {
    const updatedUser = await User.findByIdAndUpdate(userId, { height, weight, gender, activity, goal, birthdate, photoOption }, { new: true });

    if (!updatedUser) {
      return res.status(404).json({ message: "Pengguna tidak ditemukan." });
    }

    res.status(200).json({ message: "Data berhasil diperbarui.", user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
};

module.exports = { registerUser, loginUser, updateUserData, completeUserProfile };
