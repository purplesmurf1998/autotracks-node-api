const mongoose = require("mongoose");

const AccountSchema = new mongoose.Schema({
  domain: {
    type: String,
    maxlength: [50, "Domain cannot have more than 50 characters."],
    minlength: [5, "Domain must have at least 5 characters."],
    required: [true, "Domain not provided."],
    trim: true,
    unique: true,
    uppercase: true,
  },
  enabled: {
    type: Boolean,
    default: true,
  },
  creation_time: {
    type: Number,
    default: Date.now,
  },
  last_update_time: {
    type: Number,
    default: Date.now,
  },
});

module.exports = mongoose.model("Account", AccountSchema);
