const express = require("express");
const router = express.Router({ mergeParams: true });

const {
  createProperty,
  getProperties,
  updateProperty,
  deleteProperty,
} = require("../controllers/properties");
const { protect } = require("../middleware/authorization");

router.route("/").post(protect, createProperty).get(protect, getProperties);
router
  .route("/:propertyId")
  .put(protect, updateProperty)
  .delete(protect, deleteProperty);

module.exports = router;
