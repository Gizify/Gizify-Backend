const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();

// Middleware to authenticate user via JWT
const authMiddleware = (req, res, next) => {
  // Get token from Authorization header: "Bearer <token>"
  const token = req.headers["authorization"]?.split(" ")[1];

  // Reject request if token is missing
  if (!token) {
    return res.status(403).json({ message: "Akses ditolak, token tidak ditemukan." });
  }

  try {
    // Verify token using secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user ID from token to request object
    req.userId = decoded.userId;

    next(); // Proceed to next middleware or route
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: "Token tidak valid." });
  }
};

module.exports = authMiddleware;