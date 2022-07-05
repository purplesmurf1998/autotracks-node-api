const express = require("express");
const router = express.Router({ mergeParams: true });

const { createUser } = require("../controllers/users");
const { protect } = require("../middleware/authorization");

router.route("/").post(protect, createUser);

module.exports = router;
