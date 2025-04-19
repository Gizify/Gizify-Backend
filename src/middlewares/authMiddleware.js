const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

const authMiddleware = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Ambil token dari header authorization

    if (!token) {
        return res.status(403).json({ message: 'Akses ditolak, token tidak ditemukan.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId; // Simpan userId pada request untuk digunakan selanjutnya
        next();
    } catch (error) {
        console.error(error);
        return res.status(401).json({ message: 'Token tidak valid.' });
    }
};

module.exports = authMiddleware;