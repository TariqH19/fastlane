const { Schema, model } = require("mongoose");

const cartSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name of the cart is required"],
      unique: false,
    },
    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = model("Cart", cartSchema);
