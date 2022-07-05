const express = require("express");
const router = express.Router({ mergeParams: true });

const { createRole } = require("../controllers/roles");
const { protect } = require("../middleware/authorization");

router.route("/").post(protect, createRole);

module.exports = router;
