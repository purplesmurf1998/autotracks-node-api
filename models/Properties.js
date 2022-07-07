const mongoose = require("mongoose");

const PropertySchema = new mongoose.Schema({
  dealership_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Dealership",
    required: [true, "Dealership ID not provided."],
  },
  label: {
    type: String,
    required: [true, "Label not provided."],
  },
  key: {
    type: String,
    required: [true, "Key not provided."],
  },
  input_type: {
    type: String,
    enum: ["Text", "Number", "Currency", "Date", "Dropdown", "List"],
    required: [true, "Input type not provided."],
  },
  dropdown_options: [
    {
      type: String,
      default: null,
    },
  ],
  is_required: {
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
  deletion_time: {
    type: Number,
    default: null,
  },
});

// // Create the key from the label
// PropertySchema.pre('save', async function (next) {
//   // create key
//   this.key = this.label.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function (match, index) {
//     if (+match === 0) return "";
//     return index === 0 ? match.toLowerCase() : match.toUpperCase();
//   });;
//   next();
// });

// // Update the key from the label
// PropertySchema.pre('findOneAndUpdate', async function (next) {
//   // create key
//   if (this._update.label) {
//     this._update.key = this._update.label.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function (match, index) {
//       if (+match === 0) return "";
//       return index === 0 ? match.toLowerCase() : match.toUpperCase();
//     });;
//   }
//   next();
// });

module.exports = mongoose.model("Property", PropertySchema);
