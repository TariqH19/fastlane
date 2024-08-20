const { Schema, model } = require("mongoose");

const emailSchema = new Schema(
  {
    merchant: {
      type: String,
      required: [true, "Name of the email is required"],
      unique: false,
    },
    engineer: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = model("Email", emailSchema);
