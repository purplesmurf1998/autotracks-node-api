const mongoose = require("mongoose");

const PropertyConfigSchema = new mongoose.Schema({
  account_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
    required: [true, "Account ID not provided."],
  },
  dealership_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Dealership",
    required: [true, "Dealership ID not provided."],
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "User ID not provided."],
  },
  property_order: [
    {
      type: {
        property_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Property",
          required: [true, "Property ID not provided."],
        },
        visible: {
          type: Boolean,
          default: true,
        },
      },
      default: [],
    },
  ],
  property_group_by_ids: {
    type: {
      value: String,
      text: String,
    },
    default: null,
  },
});

module.exports = mongoose.model("PropertyConfig", PropertyConfigSchema);
