const mongoose = require("mongoose");

const VehicleSchema = new mongoose.Schema({
  dealership_id: {
    type: mongoose.Schema.ObjectId,
    ref: "Dealership",
    required: [true, "Vehicle must be associated to a dealership"],
  },
  vin: {
    type: String,
    required: [
      true,
      "Vehicle must have a 'Vehicle Identification Number' (VIN)",
    ],
    unique: true,
    minlength: [
      11,
      "VIN must be 17 characters long, or at least 11 characters for vehicles manufactured before 1981",
    ],
    maxlength: [
      17,
      "VIN must be 17 characters long, or at least 11 characters for vehicles manufactured before 1981",
    ],
  },
  on_road_since: {
    type: Date,
    default: null,
  },
  status: {
    type: String,
    enum: [
      "IN_STOCK",
      "SOLD",
      "PREPPING",
      "IN_REPAIR",
      "IN_DELIVERY",
      "DELIVERED",
    ],
    required: [true, "Vehicle must have a status."],
    default: "IN_STOCK",
  },
  location: {
    type: {
      location_id: {
        type: mongoose.Schema.ObjectId,
        ref: "Zone",
      },
      latitude: {
        type: Number,
        required: [true, "Vehicle location must have a latitude"],
      },
      longitude: {
        type: Number,
        required: [true, "Vehicle location must have a longitude"],
      },
    },
    default: null,
  },
  properties: Object,
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

module.exports = mongoose.model("Vehicle", VehicleSchema);
