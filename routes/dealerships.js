const express = require("express");
const router = express.Router({ mergeParams: true });

const {
  createDealership,
  geocodeAddress,
} = require("../controllers/dealerships");
const { protect } = require("../middleware/authorization");

router.route("/").post(protect, createDealership);
router.route("/geocode").post(protect, geocodeAddress);

module.exports = router;
