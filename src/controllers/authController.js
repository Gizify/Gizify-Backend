const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../config');

// Registrasi Pengguna
const registerUser = async (req, res) => {
    const { height, weight, gender, activity, goal, birthdate, photoOption } = req.body;

    try {
        // Cek apakah data sudah ada
        const userExists = await User.findOne({ email: req.body.email }); // Menggunakan email untuk pengecekan
        if (userExists) {
            return res.status(400).json({ message: 'Pengguna sudah terdaftar!' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        // Simpan ke database
        const newUser = new User({
            email: req.body.email,
            password: hashedPassword,
            height,
            weight,
            gender,
            activity,
            goal,
            birthdate,
            photoOption,
        });

        await newUser.save();

        // Kirim respons sukses
        res.status(201).json({ message: 'Registrasi berhasil!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

// Login Pengguna
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
        }

        // Verifikasi password
        const passwordValid = await bcrypt.compare(password, user.password);
        if (!passwordValid) {
            return res.status(401).json({ message: 'Password salah.' });
        }

        // Buat JWT token
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });

        // Kirim token ke frontend
        res.json({ message: 'Login berhasil!', token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

// Update Data Pengguna
const updateUserData = async (req, res) => {
    const { userId } = req.params;
    const { height, weight, gender, activity, goal, birthdate, photoOption } = req.body;

    try {
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { height, weight, gender, activity, goal, birthdate, photoOption },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
        }

        res.status(200).json({ message: 'Data berhasil diperbarui.', user: updatedUser });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

module.exports = { registerUser, loginUser, updateUserData };
