const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const dotenv = require("dotenv");
const { calculateDailyNutritionTarget } = require("../helper/authHelper");

dotenv.config();

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
    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, { expiresIn: expiresInSeconds });

    // Hitung expiredAt dalam milisecond
    const expiredAt = Date.now() + expiresInSeconds * 1000;

    res.status(201).json({ message: "Registrasi berhasil!", token, user, expiredAt });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
};

const calculateTrimester = ({ months, days }) => {
  const totalDays = months * 30 + days;
  const totalWeeks = totalDays / 7;

  if (totalWeeks <= 13) return 1;
  if (totalWeeks <= 27) return 2;
  return 3;
};

// lengkapi data pengguna untuk ibu hamil
const completeUserProfile = async (req, res) => {
  const { userId } = req;
  const { height, weight, activity, birthdate, gestational_age, photoOption, medical_history = [] } = req.body;

  try {
    const user = await User.findById(userId);
    const newTrimester = calculateTrimester(gestational_age);

    const trimesterChanged = user && user.trimester && user.trimester !== newTrimester;

    const nutritionTarget = calculateDailyNutritionTarget({
      weight,
      height,
      birthdate,
      activity_level: activity,
      trimester: newTrimester,
      medical_history,
    });

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        birthdate,
        height,
        weight,
        activity_level: activity,
        gestational_age,
        trimester: newTrimester,
        medical_history,
        daily_nutrition_target: nutritionTarget,
        photoOption,
      },
      { new: true }
    );

    let message = "Profil berhasil dilengkapi!";
    if (trimesterChanged) {
      message += " Trimester Anda telah berubah. Data nutrisi telah diperbarui.";
    }

    res.status(200).json({ message, user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal melengkapi data profil." });
  }
};

// Login Pengguna (Ibu Hamil)
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
      birthdate: user.birthdate,
      height: user.height,
      weight: user.weight,
      activity_level: user.activity_level,
      gestational_age: user.gestational_age,
      photoOption: user.photoOption,
      daily_nutrition_target: user.daily_nutrition_target,
      nutrition_stats: user.nutrition_stats,
      meal_logs: user.meal_logs,
    };

    const expiresInSeconds = 7 * 24 * 60 * 60;
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: expiresInSeconds });

    res.json({
      message: "Login berhasil!",
      token,
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
