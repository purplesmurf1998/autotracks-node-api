const ErrorResponse = require("../error-response");
const asyncHandler = require("../async-handler");
const User = require("../models/Users");
const Property = require("../models/Properties");
const Dealership = require("../models/Dealerships");
const bcrypt = require("bcrypt");
const {
  invalidObjectId,
  requiredString,
  maxStringLength,
  invalidEmail,
} = require("../validations");
const PropertyConfig = require("../models/PropertyConfigs");
const DISPLAY_NAME_MAX_LENGTH = 100;

// @desc    Create a new user
// @route   POST /users
// @access  Authenticated
exports.createUser = asyncHandler(async (req, res, next) => {
  // validate body
  const body = convertBody(req);
  const validationError = validateBody(body);
  if (validationError) return next(validationError);

  // validate password
  if (requiredString(req.body.password))
    return next(new ErrorResponse("Password not provided.", 400));

  // encrypt password using bcrypt
  const salt = await bcrypt.genSalt(10);
  const encryptedPassword = await bcrypt.hash(req.body.password, salt);

  // validate email doesn't exist already
  if (await isEmailExists(body.email))
    return next(
      new ErrorResponse(`Email '${body.email}' already exists.`, 400)
    );

  // create preferences object
  const preferences = {
    language: "EN",
    theme: "light",
  };

  // create the user object
  const userCreation = {
    account_id: body.accountId,
    active_dealership_id: body.activeDealershipId,
    allowed_dealership_ids: body.allowedDealershipIds,
    display_name: body.displayName,
    email: body.email,
    is_account_admin: body.isAccountAdmin,
    role_id: body.roleId,
    preferences,
    password: encryptedPassword,
  };

  // create the user
  const user = await User.create(userCreation);

  if (!user)
    return next(
      new ErrorResponse(
        "A problem occured during the creation of the user.",
        500
      )
    );

  // generate all allowed dealership ids if user is account admin
  if (body.isAccountAdmin) {
    let allowedDealershipIds = await Dealership.find({
      account_id: body.accountId,
    });
    body.allowedDealershipIds = allowedDealershipIds.map((item) =>
      item._id.toString()
    );
  }

  // generate default preferences for allowed dealership ids
  let preferencesList = [];
  for (let i = 0; i < body.allowedDealershipIds.length; i++) {
    const dealershipProperties = await Property.find({
      dealership_id: body.allowedDealershipIds[i],
    });
    var propertyOrder = [];
    if (dealershipProperties && dealershipProperties.length > 0) {
      propertyOrder = dealershipProperties.map((item) => {
        return {
          property_id: item._id,
          visible: true,
        };
      });
    }
    preferencesList.push({
      account_id: body.accountId,
      dealership_id: body.allowedDealershipIds[i],
      user_id: user._id,
      property_order: propertyOrder,
      property_group_by_ids: [],
    });
  }

  // create document batch
  const propertyConfigs = await PropertyConfig.insertMany(preferencesList);

  if (!propertyConfigs) {
    // delete the new user
    await User.findByIdAndDelete(user._id);
    return next(
      new ErrorResponse(
        "A problem occured during the creation of the user.",
        500
      )
    );
  }

  res.status(201).json(user);
});

// @desc    Get account users
// @route   GET /accounts/{accountId}/users
// @access  Authenticated
exports.getUsers = asyncHandler(async (req, res, next) => {
  // get the formatted query based on the advnaced filtering
  const users = await User.find({
    account_id: req.params.accountId,
    deletion_time: null,
  });

  res.status(200).json(users);
});

// @desc    Get a specific user
// @route   GET /users/{userId}
// @access  Authenticated
exports.getUser = asyncHandler(async (req, res, next) => {
  const user = User.findOne({ _id: req.params.userId, deletion_time: null });

  if (!user) {
    return next(
      new ErrorResponse(`User with ID '${req.params.userId}' not found.`, 404)
    );
  }

  res.status(200).json(user);
});

function convertBody(req) {
  return {
    accountId: req.body.account_id,
    activeDealershipId: req.body.active_dealership_id,
    allowedDealershipIds: req.body.allowed_dealership_ids
      ? req.body.allowed_dealership_ids
      : [],
    displayName: req.body.display_name ? req.body.display_name.trim() : null,
    email: req.body.email ? req.body.email.trim().toLowerCase() : null,
    isAccountAdmin: req.body.is_account_admin
      ? req.body.is_account_admin
      : false,
    roleId: req.body.role_id,
  };
}

async function isEmailExists(email) {
  return await User.exists({ email });
}

function validateBody(body) {
  const {
    accountId,
    activeDealershipId,
    allowedDealershipIds,
    displayName,
    email,
    isAccountAdmin,
    roleId,
  } = body;

  // validate accountId
  if (requiredString(accountId))
    return new ErrorResponse("Account ID not provided.", 400);
  if (invalidObjectId(accountId))
    return new ErrorResponse(
      `Account ID ${accountId} is not a valid ObjectId.`,
      400
    );

  // validate activeDealershipId
  if (activeDealershipId && invalidObjectId(activeDealershipId))
    return new ErrorResponse(
      `Active dealership ID ${accountId} is not a valid ObjectId.`,
      400
    );

  // validate allowedDealershipIds
  if (allowedDealershipIds && allowedDealershipIds.length > 0) {
    for (let i = 0; i < allowedDealershipIds.length; i++) {
      if (invalidObjectId(allowedDealershipIds[i]))
        return new ErrorResponse(
          `Active dealership ID ${allowedDealershipIds[i]} is not a valid ObjectId.`,
          400
        );
    }
  }

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
  if (!isAccountAdmin && !activeDealershipId)
    return new ErrorResponse(
      `Non admin user must have an active dealership ID.`,
      400
    );

  // validate role
  if (roleId && invalidObjectId(roleId))
    return new ErrorResponse(
      `Role ID ${accountId} is not a valid ObjectId.`,
      400
    );
  if (!isAccountAdmin && !roleId)
    return new ErrorResponse(`Non admin user must have a role ID.`, 400);

  // all validations passed
  return null;
}
