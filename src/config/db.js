// Import Mongoose library for MongoDB interactions
const mongoose = require("mongoose");

// Import and configure dotenv to load environment variables from a .env file
const dotenv = require("dotenv");
dotenv.config();

// Define an asynchronous function to connect to MongoDB
const connectDB = async () => {
  try {
    // Attempt to connect to MongoDB using the URI from environment variables
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,       // Use the new MongoDB connection string parser
      useUnifiedTopology: true,    // Use the new Server Discover and Monitoring engine
    });

    // Log success message if connection is established
    console.log("✅ MongoDB connected");
  } catch (error) {
    // Log error message if connection fails and exit the process with failure code
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

// Export the connectDB function for use in other modules
module.exports = connectDB;