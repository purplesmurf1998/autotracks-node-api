const express = require("express");
const router = express.Router({ mergeParams: true });

const { createRole, getRoles } = require("../controllers/roles");
const { protect } = require("../middleware/authorization");

router.route("/").post(protect, createRole).get(protect, getRoles);

module.exports = router;
