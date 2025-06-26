const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const dotenv = require("dotenv");
const { calculateDailyNutritionTarget } = require("../helper/authHelper");

dotenv.config();

// 📌 Registrasi Pengguna Baru
const registerUser = async (req, res) => {
  const { email, password, name } = req.body;

  try {
    // Cek apakah email sudah terdaftar
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "Email sudah terdaftar!" });
    }

    // Hash password sebelum disimpan
    const hashedPassword = await bcrypt.hash(password, 10);

    // Buat dan simpan user baru
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

    // Generate JWT token berlaku selama 7 hari
    const expiresInSeconds = 7 * 24 * 60 * 60;
    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, { expiresIn: expiresInSeconds });

    // Hitung waktu kedaluwarsa token dalam milidetik
    const expiredAt = Date.now() + expiresInSeconds * 1000;

    // Kirim response sukses
    res.status(201).json({ message: "Registrasi berhasil!", token, user, expiredAt });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
};

// 📌 Fungsi bantu: Hitung trimester kehamilan berdasarkan usia kehamilan
const calculateTrimester = ({ months, days }) => {
  const totalDays = months * 30 + days;
  const totalWeeks = totalDays / 7;

  if (totalWeeks <= 13) return 1;
  if (totalWeeks <= 27) return 2;
  return 3;
};

// 📌 Lengkapi Profil Pengguna (Ibu Hamil)
const completeUserProfile = async (req, res) => {
  const { userId } = req;
  const { height, weight, activity, birthdate, gestational_age, photoOption, medical_history = [] } = req.body;

  try {
    // Ambil data pengguna saat ini
    const user = await User.findById(userId);
    const newTrimester = calculateTrimester(gestational_age);

    // Cek apakah trimester berubah
    const trimesterChanged = user && user.trimester && user.trimester !== newTrimester;

    // Hitung target nutrisi harian berdasarkan data terbaru
    const nutritionTarget = calculateDailyNutritionTarget({
      weight,
      height,
      birthdate,
      activity_level: activity,
      trimester: newTrimester,
      medical_history,
    });

    // Update data pengguna di database
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        height,
        weight,
        birthdate,
        activity_level: activity,
        gestational_age,
        trimester: newTrimester,
        medical_history,
        daily_nutrition_target: nutritionTarget,
        photoOption,
      },
      { new: true }
    );

    // Buat pesan jika trimester berubah
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

// 📌 Login Pengguna (Ibu Hamil)
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Cek apakah pengguna ada di database
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Pengguna tidak ditemukan." });
    }

    // Verifikasi password
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return res.status(401).json({ message: "Password salah." });
    }

    // Ambil data penting pengguna
    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      birthdate: user.birthDate,
      height: user.height,
      weight: user.weight,
      activity_level: user.activity_level,
      gestational_age: user.gestational_age,
      photoOption: user.photoOption,
      daily_nutrition_target: user.daily_nutrition_target,
      nutrition_stats: user.nutrition_stats,
      meal_logs: user.meal_logs,
    };

    // Generate token akses
    const expiresInSeconds = 7 * 24 * 60 * 60;
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: expiresInSeconds });

    // Kirim response sukses login
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

// 📌 Update Data Umum Pengguna
const updateUserData = async (req, res) => {
  const { userId } = req.params;
  const { height, weight, gender, activity, goal, birthdate, photoOption } = req.body;

  try {
    // Update data pengguna berdasarkan ID
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

// 📦 Export controller functions
module.exports = {
  registerUser,
  loginUser,
  updateUserData,
  completeUserProfile,
};
