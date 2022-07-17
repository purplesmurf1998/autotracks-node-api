const express = require("express");
const router = express.Router({ mergeParams: true });

const {
  createDealership,
  getDealerships,
  getDealership,
  geocodeAddress,
  activateDealership,
} = require("../controllers/dealerships");
const { protect, isAdmin } = require("../middleware/authorization");

router
  .route("/")
  .post(protect, isAdmin, createDealership)
  .get(protect, getDealerships);
router.route("/:dealershipId").get(protect, getDealership);
router.route("/:dealershipId/activate").post(protect, activateDealership);
router.route("/geocode").post(protect, geocodeAddress);

module.exports = router;
