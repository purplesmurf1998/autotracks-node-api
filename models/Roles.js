const mongoose = require("mongoose");

const RoleSchema = new mongoose.Schema({
  dealership_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Dealership",
    required: [true, "Dealership ID not provided."],
  },
  title: {
    type: String,
    required: [true, "Title not provided."],
  },
  permissions: [
    {
      resource: {
        type: String,
        required: [true, "Resource string not provided."],
      },
      policy: {
        create: Boolean,
        read: Boolean,
        update: Boolean,
        delete: Boolean,
      },
      default: [],
    },
  ],
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

module.exports = mongoose.model("Role", RoleSchema);
