const mongoose = require("mongoose");

const nutrientSchema = new mongoose.Schema(
  {
    fdc_id: {
      type: Number,
      required: true,
      index: true,
    },
    Food: {
      type: String,
      required: true,
    },
    Nutrient: {
      type: String,
      required: true,
    },
    Amount: {
      type: Number,
      required: true,
    },
    Unit: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("foodnutrients", nutrientSchema);
