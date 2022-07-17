const express = require("express");
const router = express.Router({ mergeParams: true });

const {
  getPropertyConfig,
  updatePropertyOrder,
} = require("../controllers/propertyconfigs");
const { protect } = require("../middleware/authorization");

router.route("/").get(protect, getPropertyConfig);
router.route("/:propertyConfigId").put(protect, updatePropertyOrder);

module.exports = router;
