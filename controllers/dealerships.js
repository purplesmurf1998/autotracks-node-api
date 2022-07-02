const ErrorResponse = require("../error-response");
const asyncHandler = require("../async-handler");
const Dealership = require("../models/Dealerships");
const PropertyConfig = require("../models/PropertyConfigs");
const User = require("../models/Users");
const {
  invalidObjectId,
  requiredString,
  maxStringLength,
  requiredObject,
} = require("../validations");
const NAME_MAX_LENGTH = 50;

// @desc    Create a new dealership
// @route   POST /dealerships
// @access  Authenticated
exports.createDealership = asyncHandler(async (req, res, next) => {
  // validate body
  const body = convertBody(req);
  const validationError = validateBody(body);
  if (validationError) return next(validationError);

  // create the dealership
  const dealership = await Dealership.create(body);

  if (!dealership)
    return next(
      new ErrorResponse(
        "An error has occurred when creating the dealership.",
        500
      )
    );

  // if there is a list of user ids, add the dealership ID to their allowed_dealership_ids list
  // and create property configs
  if (req.body.user_ids && req.body.user_ids > 0) {
    for (let i = 0; i < req.body.user_ids; i++) {
      // 1. find the user and add the dealership id in their allowed_dealership_ids list
      let user = await User.findById(req.body.user_ids[i]);
      let allowedDealershipIds = user.allowed_dealership_ids
        ? user.allowed_dealership_ids
        : [];
      allowedDealershipIds.push(dealership._id.toString());
      user.allowed_dealership_ids = allowedDealershipIds;
      await user.save();

      // 2. create their property config for this dealership
      const config = {
        account_id: user.account_id.toString(),
        dealership_id: dealership._id.toString(),
        user_id: user._id.toString(),
        property_order: [],
        property_group_by_ids: [],
      };

      await PropertyConfig.create(config);
    }
  }

  // create property config for every admin in the account
  const admins = await User.find({
    account_id: body.accountId,
    is_account_admin: true,
    deletion_time: null,
  });
  if (!admins)
    return next(
      new ErrorResponse(
        "An error has occurred when creating the dealership.",
        500
      )
    );

  let propertyConfigs = admins.map((item) => {
    return {
      account_id: body.accountId,
      dealership_id: dealership._id.toString(),
      user_id: item._id.toString(),
      property_order: [],
      property_group_by_ids: [],
    };
  });
  await PropertyConfig.insertMany(propertyConfigs);

  res.status(201).json(dealership);
});

// @desc    Get dealerships for an account
// @route   GET /accounts/{accountId}/dealerships
// @access  Authenticated
exports.getDealerships = asyncHandler(async (req, res, next) => {
  // run query in mongoose
  const dealerships = await Dealership.find({
    account_id: req.params.accountId,
    deletion_time: null,
  });

  // send response
  res.status(200).json(dealerships);
});

// @desc    Get a dealership
// @route   GET /dealerships/{dealershipId}
// @access  Authenticated
exports.getDealership = asyncHandler(async (req, res, next) => {
  // run query in mongoose
  const dealership = await Dealership.findOne({
    _id: req.params.dealershipId,
    deletion_time: null,
  });

  if (!dealership) {
    return next(
      new ErrorResponse(`User with ID '${req.params.userId}' not found.`, 404)
    );
  }

  // send response
  res.status(200).json(dealership);
});

function convertBody(req) {
  return {
    accountId: req.body.account_id,
    name: req.body.name,
    geocodedAddress: req.body.geocoded_address,
    formattedAddress: req.body.formatted_address,
    latitude: req.body.latitude,
    longitude: req.body.longitude,
  };
}

function validateBody(body) {
  const {
    accountId,
    name,
    geocodedAddress,
    formattedAddress,
    latitude,
    longitude,
  } = body;

  // validate accountId
  if (requiredString(accountId))
    return new ErrorResponse("Account ID not provided.", 400);
  if (invalidObjectId(accountId))
    return new ErrorResponse(
      `Account ID ${accountId} is not a valid ObjectId.`,
      400
    );

  // validate name
  if (requiredString(name))
    return new ErrorResponse(`Display name not provided.`, 400);
  if (maxStringLength(name, NAME_MAX_LENGTH))
    return new ErrorResponse(
      `Name too long. Must be less than or equal to ${NAME_MAX_LENGTH} characters.`,
      400
    );

  // validate geocoded address
  if (requiredObject(geocodedAddress))
    return new ErrorResponse(`Geocoded address not provided.`, 400);

  // validate formatted address
  if (requiredString(formattedAddress))
    return new ErrorResponse(`Formatted address not provided.`, 400);

  // validate geocoded address
  if (requiredObject(latitude))
    return new ErrorResponse(`Latitude not provided.`, 400);

  // validate geocoded address
  if (requiredObject(longitude))
    return new ErrorResponse(`Longitude not provided.`, 400);

  // all validations passed
  return null;
}
