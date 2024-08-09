const { Schema, model } = require("mongoose");

const customSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name of the custom is required"],
      unique: false,
    },
    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = model("Custom", customSchema);
