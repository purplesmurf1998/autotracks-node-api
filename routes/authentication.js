const express = require("express");
const router = express.Router();

const { createAccount } = require("../controllers/accounts");
const {
  createAdmin,
  signIn,
  signOut,
  verify,
} = require("../controllers/authentication");
const { protect } = require("../middleware/authorization");

router.route("/register").post(createAccount, createAdmin);
router.route("/signin").post(signIn);
router.route("/signout").get(signOut);
router.route("/verify").get(protect, verify);

module.exports = router;
