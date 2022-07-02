const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  account_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
    required: [true, "Account ID not provided."],
  },
  active_dealership_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Dealership",
    default: null,
  },
  allowed_dealership_ids: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealership",
      default: [],
    },
  ],
  display_name: {
    type: String,
    maxlength: [100, "Display name cannot be more than 100 characters long."],
    required: [true, "Display name not provided."],
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    unique: true,
    required: "Email address not provided.",
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      "Email address not valid.",
    ],
  },
  is_account_admin: {
    type: Boolean,
    default: false,
  },
  role_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Role",
    default: null,
  },
  preferences: {
    language: {
      type: String,
      enum: ["EN", "FR"],
      default: "EN",
    },
    theme: {
      type: String,
      enum: ["light", "dark"],
      default: "light",
    },
  },
  password: {
    type: String,
    required: [true, "Password not provided."],
    select: false,
  },
  creation_time: {
    type: Number,
    default: Date.now,
  },
  last_update_time: {
    type: Number,
    default: Date.now,
  },
  deletion_time: {
    type: Number,
    default: null,
  },
});

module.exports = mongoose.model("User", UserSchema);
