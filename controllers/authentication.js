const ErrorResponse = require("../error-response");
const asyncHandler = require("../async-handler");
const User = require("../models/Users");
const Property = require("../models/Properties");
const Dealership = require("../models/Dealerships");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {
  requiredString,
  maxStringLength,
  invalidEmail,
} = require("../validations");
const PropertyConfig = require("../models/PropertyConfigs");
const Account = require("../models/Accounts");
const DISPLAY_NAME_MAX_LENGTH = 100;

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

  // validate the body
  const body = convertBody(req);
  const validationError = validateBody(body);
  if (validationError) return next(await handleError(validationError), req);

  // validate password
  if (requiredString(req.body.password))
    return next(
      await handleError(new ErrorResponse("Password not provided.", 400)),
      req
    );

  // encrypt password using bcrypt
  const salt = await bcrypt.genSalt(10);
  const encryptedPassword = await bcrypt.hash(req.body.password, salt);

  // validate email doesn't exist already
  if (await isEmailExists(body.email))
    return next(
      await handleError(
        new ErrorResponse(`Email '${body.email}' already exists.`, 400)
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
    display_name: body.displayName,
    email: body.email,
    is_account_admin: body.isAccountAdmin,
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
    return next(new ErrorResponse("Email and/or password not provided.", 400));
  }

  // check for user
  // use select to return the password in the user object
  const user = await User.findOne({ email }).select("+password");

  // validate that the user exists
  if (!user) {
    return next(new ErrorResponse("Invalid credentials.", 401));
  }

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
exports.verify = (req, res, next) => {
  res.status(200).json(req.token);
};

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
      activeDealershipId: user.active_dealership_id,
      allowedDealershipIds: user.allowedDealershipIds,
      isAccountAdmin: user.is_account_admin,
      role_id: user.role_id,
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
  return await User.exists({ email });
}

function convertBody(req) {
  return {
    displayName: req.body.display_name ? req.body.display_name.trim() : null,
    email: req.body.email ? req.body.email.trim().toLowerCase() : null,
    isAccountAdmin: req.body.is_account_admin
      ? req.body.is_account_admin
      : false,
  };
}

function validateBody(body) {
  const { displayName, email, isAccountAdmin } = body;

  // validate displayName
  if (requiredString(displayName))
    return new ErrorResponse(`Display name not provided.`, 400);
  if (maxStringLength(displayName, DISPLAY_NAME_MAX_LENGTH))
    return new ErrorResponse(
      `Display name too long. Must be less than or equal to ${DISPLAY_NAME_MAX_LENGTH} characters.`,
      400
    );

  // validate email address
  if (requiredString(email))
    return new ErrorResponse(`Email address not provided.`, 400);
  if (invalidEmail(email))
    return new ErrorResponse(
      `Email '${email}' is not a valid email address.`,
      400
    );

  // validate activeDealershipId with isAccountAdmin
  if (!isAccountAdmin)
    return new ErrorResponse(
      `Registration of a new user must be an admin.`,
      400
    );

  // all validations passed
  return null;
}
