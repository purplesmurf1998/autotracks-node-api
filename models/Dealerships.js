const mongoose = require("mongoose");

const DealershipSchema = new mongoose.Schema({
  account_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
    required: [true, "Account ID not provided."],
  },
  name: {
    type: String,
    maxlength: [50, "Name cannot be more than 25 characters long"],
    required: [true, "Name not provided."],
  },
  geocoded_address: {
    type: Object,
    required: [true, "Geocoded address not provided."],
  },
  formatted_address: {
    type: String,
    required: [true, "Formatted address not provided."],
  },
  latitude: {
    type: Number,
    required: [true, "Latitude not provided."],
  },
  longitude: {
    type: Number,
    required: [true, "Longitude not provided."],
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

module.exports = mongoose.model("Dealership", DealershipSchema);
