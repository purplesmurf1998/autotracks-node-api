const express = require("express");
const router = express.Router();

const { createAccount } = require("../controllers/accounts");

router.route("/").post(createAccount);

module.exports = router;
