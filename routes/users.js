const express = require("express");
const router = express.Router({ mergeParams: true });

const { createUser, getUsers, updateUser } = require("../controllers/users");
const { protect } = require("../middleware/authorization");

router.route("/").get(getUsers).post(protect, createUser);
router.route("/:userId").put(protect, updateUser);

module.exports = router;
