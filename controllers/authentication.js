const ErrorResponse = require("../error-response");
const asyncHandler = require("../async-handler");
const User = require("../models/Users");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { requiredString } = require("../validations");
const Account = require("../models/Accounts");

// @desc    Create a new admin user
// @route   POST /register
// @access  Public
exports.createAdmin = asyncHandler(async (req, res, next) => {
  // validate the account
  if (!req.account) {
    return next(
      await handleError(
        new ErrorResponse("Account was not created properly.", 400),
        req
      )
    );
  }

  // clean data
  const displayName = req.body.display_name
    ? req.body.display_name.trim()
    : null;
  const email = req.body.email ? req.body.email.trim().toLowerCase() : null;
  const isAccountAdmin = req.body.is_account_admin
    ? req.body.is_account_admin
    : false;
  const password = req.body.password;

  // validate password
  if (requiredString(password))
    return next(
      await handleError(new ErrorResponse("Password not provided.", 400)),
      req
    );

  // encrypt password using bcrypt
  const salt = await bcrypt.genSalt(10);
  const encryptedPassword = await bcrypt.hash(password, salt);

  // validate email doesn't exist already
  if (await isEmailExists(email))
    return next(
      await handleError(
        new ErrorResponse(`Email '${email}' already exists.`, 400)
      ),
      req
    );

  // create preferences object
  const preferences = {
    language: "EN",
    theme: "light",
  };

  // create the user object
  const adminCreation = {
    account_id: req.account._id,
    active_dealership_id: null,
    allowed_dealership_id: [],
    display_name: displayName,
    email: email,
    is_account_admin: isAccountAdmin,
    role_id: null,
    preferences,
    password: encryptedPassword,
  };

  // create the user
  const user = await User.create(adminCreation);

  if (!user)
    return next(
      await handleError(
        new ErrorResponse(
          "A problem occured during the creation of the user.",
          500
        )
      ),
      req
    );

  res.status(201).json({
    admin: user,
    account: req.account,
  });
});

// @desc    Sign in user and return a valid JWT
// @route   POST /auth/signin
// @access  Public
exports.signIn = asyncHandler(async (req, res, next) => {
  // get email and password from the body
  const { email, password } = req.body;

  // validate that email and password exist
  if (!email || !password) {
    return next(new ErrorResponse("Invalid credentials.", 401));
  }

  // check for user
  // use select to return the password in the user object
  const user = await User.findOne({ email, deletion_time: null })
    .select("+password")
    .populate("active_dealership_id");

  // validate that the user exists
  if (!user) {
    return next(new ErrorResponse("Invalid credentials.", 401));
  }
  // if no password is returned, it is because user has not clicked on the activation link
  if (!user.password) {
    return next(new ErrorResponse("Invalid credentials.", 401));
  }

  // validate the entered password to the user password
  const passwordMatch = await matchPassword(password, user.password);
  if (!passwordMatch) {
    return next(new ErrorResponse("Invalid credentials.", 401));
  }

  // send response with token in cookies
  sendTokenResponse(user, 200, res);
});

// @desc    Logout user and clear JWT from browser/cookies
// @route   GET /auth/signout
// @access  Authenticated
exports.signOut = (req, res, next) => {
  // clear the token from the cookies
  res.status(200).clearCookie("autotracksAuthToken").json({});
};

// @desc    Verify if the user is logged in
// @route   GET /auth/verify
// @access  Authenticated
exports.verify = asyncHandler(async (req, res, next) => {
  // grab the user
  const user = await User.findOne({
    _id: req.token.userId,
    deletion_time: null,
  }).populate("active_dealership_id");

  if (!user)
    return next(
      new ErrorResponse("Not authorized to access this endpoint.", 401)
    );

  sendTokenResponse(user, 200, res);
});

function sendTokenResponse(user, statusCode, res) {
  // create token for this user
  const token = signJWT(user);

  // token expires in 30 days
  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  // if server running in production, add secure flag to cookie
  if (process.env.NODE_ENV === "production") {
    options.secure = true;
  }

  // remove password
  delete user.password;

  // send response with cookie and token
  res.status(statusCode).cookie("autotracksAuthToken", token, options).json({
    user,
    token,
  });
}

function signJWT(user) {
  return jwt.sign(
    {
      userId: user._id,
      accountId: user.account_id,
      displayName: user.display_name,
      email: user.email,
      activeDealershipId: user.active_dealership_id
        ? user.active_dealership_id._id
        : null,
      activeDealershipName: user.active_dealership_id
        ? user.active_dealership_id._name
        : null,
      allowedDealershipIds: user.allowed_dealership_ids,
      isAccountAdmin: user.is_account_admin,
      roleId: user.role_id,
      preferences: user.preferences,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE,
    }
  );
}

async function matchPassword(input, password) {
  return await bcrypt.compare(input, password);
}

async function handleError(err, req) {
  // delete the account if it was created
  if (req.account) await Account.findByIdAndDelete(req.account._id);

  return err;
}

async function isEmailExists(email) {
  return await User.exists({ email, deletion_time: null });
}
