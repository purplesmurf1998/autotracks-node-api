const express = require("express");
const router = express.Router({ mergeParams: true });

const {
  createVehicle,
  getVehicle,
  getVehicles,
  updateVehicle,
  deleteVehicle,
} = require("../controllers/vehicles");
const { protect } = require("../middleware/authorization");

router.route("/").post(protect, createVehicle).get(protect, getVehicles);
router
  .route("/:vehicleId")
  .put(protect, updateVehicle)
  .get(protect, getVehicle)
  .delete(protect, deleteVehicle);

module.exports = router;
