const ErrorResponse = require("../error-response");
const asyncHandler = require("../async-handler");
const User = require("../models/Users");
const Property = require("../models/Properties");
const Dealership = require("../models/Dealerships");
const bcrypt = require("bcrypt");
const { invalidObjectId } = require("../validations");
const PropertyConfig = require("../models/PropertyConfigs");

// @desc    Create a new user
// @route   POST accounts/{accountId}/users
// @access  Authenticated
exports.createUser = asyncHandler(async (req, res, next) => {
  // clean data
  const activeDealershipId = req.body.active_dealership_id;
  const allowedDealershipIds = req.body.allowed_dealership_id
    ? req.body.allowed_dealership_ids
    : [];
  const displayName = req.body.display_name
    ? req.body.display_name.trim()
    : null;
  const email = req.body.email ? req.body.email.trim().toLowerCase() : null;
  const isAccountAdmin = req.body.is_account_admin
    ? req.body.is_account_admin
    : false;
  const roleId = req.body.role_id;

  // validate the account ID
  if (invalidObjectId(req.params.accountId))
    return new ErrorResponse(
      `Account ID ${req.params.accountId} is not a valid ObjectId.`,
      400
    );

  // validate email doesn't exist already
  if (await isEmailExists(email))
    return next(new ErrorResponse(`Email '${email}' already exists.`, 400));

  // create preferences object
  const preferences = {
    language: "EN",
    theme: "light",
  };

  // generate all allowed dealership ids if user is account admin
  if (isAccountAdmin) {
    let dealerships = await Dealership.find({
      account_id: req.params.accountId,
      deletion_time: null,
    });
    allowedDealershipIds = dealerships.map((item) => item._id.toString());
  }

  // create the user object
  const userCreation = {
    account_id: req.params.accountId,
    active_dealership_id: activeDealershipId,
    allowed_dealership_ids: allowedDealershipIds,
    display_name: displayName,
    email,
    is_account_admin: isAccountAdmin,
    role_id: roleId,
    preferences,
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

  // generate default configs for allowed dealership ids
  let configsList = [];
  for (let i = 0; i < allowedDealershipIds.length; i++) {
    const dealershipProperties = await Property.find({
      dealership_id: body.allowedDealershipIds[i],
      deletion_time: null,
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
    configsList.push({
      account_id: req.params.accountId,
      dealership_id: body.allowedDealershipIds[i],
      user_id: user._id,
      property_order: propertyOrder,
      property_group_by_ids: null,
    });
  }

  // create document batch
  const propertyConfigs = await PropertyConfig.insertMany(configsList);

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

// @desc    Update a user
// @route   PUT /accounts/{accountId}/users/{userId}
// @access  Authenticated
exports.updateUser = asyncHandler(async (req, res, next) => {
  // clean data
  const activeDealershipId = req.body.active_dealership_id;
  const allowedDealershipIds = req.body.allowed_dealership_id
    ? req.body.allowed_dealership_ids
    : [];
  const displayName = req.body.display_name
    ? req.body.display_name.trim()
    : null;
  const isAccountAdmin = req.body.is_account_admin
    ? req.body.is_account_admin
    : false;
  const roleId = req.body.role_id;
  const preferences = req.body.preferences;

  // validate the account ID
  if (invalidObjectId(req.params.accountId))
    return new ErrorResponse(
      `Account ID ${req.params.accountId} is not a valid ObjectId.`,
      400
    );

  // validate the user ID
  if (invalidObjectId(req.params.userId))
    return new ErrorResponse(
      `User ID ${req.params.userId} is not a valid ObjectId.`,
      400
    );

  if (isAccountAdmin) roleId = null;

  // generate all allowed dealership ids if user is account admin
  if (isAccountAdmin) {
    let allowedDealershipIds = await Dealership.find({
      account_id: req.params.accountId,
      deletion_time: null,
    });
    allowedDealershipIds = allowedDealershipIds.map((item) =>
      item._id.toString()
    );
  }

  // create the user object
  const userUpdate = {
    active_dealership_id: activeDealershipId,
    allowed_dealership_ids: allowedDealershipIds,
    display_name: displayName,
    is_account_admin: isAccountAdmin,
    role_id: roleId,
    preferences,
  };

  // find user and update
  const user = await User.updateOne(
    { _id: req.params.userId, deletion_time: null },
    userUpdate,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!user)
    return next(
      new ErrorResponse("A problem occured during the user update.", 500)
    );

  // generate default configs for new allowed dealership ids
  let configsList = [];
  const existingConfigs = await PropertyConfig.find({
    account_id: req.params.accountId,
    user_id: user._id,
  });
  const configsToCreate = [];
  for (let i = 0; i < allowedDealershipIds.length; i++) {
    if (
      !existingConfigs.find(
        (config) => config.dealership_id.toString() === allowedDealershipIds[i]
      )
    )
      configsToCreate.push(allowedDealershipIds[i]);
  }
  for (let i = 0; i < configsToCreate.length; i++) {
    const dealershipProperties = await Property.find({
      dealership_id: configsToCreate[i],
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
    configsList.push({
      account_id: req.params.accountId,
      dealership_id: configsToCreate[i],
      user_id: user._id,
      property_order: propertyOrder,
      property_group_by_ids: null,
    });
  }

  // create document batch
  const propertyConfigs = await PropertyConfig.insertMany(configsList);

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

// @desc    Get account users with the possibility to filter for dealership
// @route   GET /accounts/{accountId}/users
// @access  Authenticated
exports.getUsers = asyncHandler(async (req, res, next) => {
  // validate the account ID
  if (invalidObjectId(req.params.accountId))
    return new ErrorResponse(
      `Account ID ${req.params.accountId} is not a valid ObjectId.`,
      400
    );

  const accountUsers = await User.find({
    account_id: req.params.accountId,
    deletion_time: null,
  }).populate("role_id");

  let users = accountUsers;

  console.log(req.query.dealershipId);
  console.log(users);
  if (req.query.dealershipId) {
    if (invalidObjectId(req.query.dealershipId))
      return new ErrorResponse(
        `Dealership ID ${req.query.dealershipId} is not a valid ObjectId.`,
        400
      );

    users = accountUsers.filter((user) => {
      return user.allowed_dealership_ids
        .map((id) => id.toString())
        .includes(req.query.dealershipId);
    });
  }

  console.log(users);

  res.status(200).json(users);
});

// @desc    Get a specific user
// @route   GET /accounts/{accountId}/users/{userId}
// @access  Authenticated
exports.getUser = asyncHandler(async (req, res, next) => {
  // validate the account ID
  if (invalidObjectId(req.params.accountId))
    return new ErrorResponse(
      `Account ID ${req.params.accountId} is not a valid ObjectId.`,
      400
    );

  // validate the user ID
  if (invalidObjectId(req.params.userId))
    return new ErrorResponse(
      `User ID ${req.params.userId} is not a valid ObjectId.`,
      400
    );

  const user = await User.findOne({
    _id: req.params.userId,
    account_id: req.params.accountId,
    deletion_time: null,
  });

  if (!user) {
    return next(
      new ErrorResponse(`User with ID '${req.params.userId}' not found.`, 404)
    );
  }

  res.status(200).json(user);
});

async function isEmailExists(email) {
  return await User.exists({ email });
}
