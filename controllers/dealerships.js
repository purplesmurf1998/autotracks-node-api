const ErrorResponse = require("../error-response");
const asyncHandler = require("../async-handler");
const Dealership = require("../models/Dealerships");
const PropertyConfig = require("../models/PropertyConfigs");
const User = require("../models/Users");
const NodeGeocoder = require("node-geocoder");
const dotenv = require("dotenv");
if (process.env.NODE_ENV === "development") {
  console.log("Running in development mode.");
  dotenv.config({ path: "./.env" });
}
const geocoderOptions = {
  provider: "google",
  apiKey: process.env.GOOGLE_API_KEY,
};
const geocoder = NodeGeocoder(geocoderOptions);
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
  // validate that the user creating the dealership is admin
  if (!req.token.isAccountAdmin)
    return next(
      new ErrorResponse(`Unauthorized to access this endpoint.`, 401)
    );

  // validate body
  const body = convertBody(req);
  const validationError = validateBody(body);
  if (validationError) return next(validationError);

  // validate the account ID
  if (invalidObjectId(req.params.accountId))
    return next(
      new ErrorResponse(
        `Account ID ${req.params.accountId} is not a valid ObjectId.`,
        400
      )
    );

  // validate the dealership name doesn't exist
  if (await isNameExists(req.params.accountId, body.name))
    return next(
      new ErrorResponse(
        `Dealership with name '${body.name}' already exists for this account.`,
        400
      )
    );

  const dealershipCreation = {
    name: body.name,
    geocoded_address: body.geocodedAddress,
    formatted_address: body.formattedAddress,
    latitude: body.latitude,
    longitude: body.longitude,
    account_id: req.params.accountId,
  };

  // create the dealership
  const dealership = await Dealership.create(dealershipCreation);

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

  // create property config for every admin in the account and add dealership ID to
  // allowed dealership ids list
  const admins = await User.find({
    account_id: dealership.account_id,
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

  let propertyConfigs = await Promise.all(
    admins.map(async (admin) => {
      let allowedDealershipIds = admin.allowed_dealership_ids
        ? admin.allowed_dealership_ids
        : [];
      allowedDealershipIds.push(dealership._id.toString());
      await User.findByIdAndUpdate(admin._id, {
        allowed_dealership_ids: allowedDealershipIds,
      });
      return {
        account_id: admin.account_id.toString(),
        dealership_id: dealership._id.toString(),
        user_id: admin._id.toString(),
        property_order: [],
        property_group_by_ids: [],
      };
    })
  );
  await PropertyConfig.insertMany(propertyConfigs);

  res.status(201).json(dealership);
});

// @desc    Get dealerships for an account
// @route   GET /accounts/{accountId}/dealerships
// @access  Authenticated
exports.getDealerships = asyncHandler(async (req, res, next) => {
  // validate the account ID
  if (invalidObjectId(req.params.accountId))
    return next(
      new ErrorResponse(
        `Account ID ${req.params.accountId} is not a valid ObjectId.`,
        400
      )
    );

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

// @desc    Geocode dealership address
// @route   POST dealerships/geocode
// @access  Private
exports.geocodeAddress = asyncHandler(async (req, res, next) => {
  // validate address body
  const { street, city, province_state, country } = req.body;

  if (requiredString(street))
    return next(new ErrorResponse("Street not provided.", 400));
  if (requiredString(city))
    return next(new ErrorResponse("City not provided.", 400));
  if (requiredString(province_state))
    return next(new ErrorResponse("Province or state not provided.", 400));
  if (requiredString(country))
    return next(new ErrorResponse("Country not provided.", 400));

  let address = `${street} ${city}, ${province_state}, ${country}`;
  const geocodedAddress = await geocoder.geocode(address);

  res.status(201).json(geocodedAddress[0]);
});

// @desc    Activate a dealership
// @route   GET accounts/{accountId}/dealerships/{dealershipId}/activate
// @access  Private
exports.activateDealership = asyncHandler(async (req, res, next) => {
  console.log(req);
  // validate the account ID
  if (invalidObjectId(req.params.accountId))
    return next(
      new ErrorResponse(
        `Account ID ${req.params.accountId} is not a valid ObjectId.`,
        400
      )
    );

  // validate the dealership ID
  if (invalidObjectId(req.params.dealershipId))
    return next(
      new ErrorResponse(
        `Dealership ID ${req.params.dealershipId} is not a valid ObjectId.`,
        400
      )
    );

  // make sure the dealership exists
  const dealership = await Dealership.findOne({
    account_id: req.params.accountId,
    _id: req.params.dealershipId,
    deletion_time: null,
  });

  if (!dealership)
    return next(
      new ErrorResponse(
        `Dealership '${req.params.dealershipId}' not found.`,
        404
      )
    );

  // make sure the user has access to the dealership
  const allowedDealershipIds = req.token.allowedDealershipIds;
  if (
    !allowedDealershipIds ||
    !allowedDealershipIds.includes(req.params.dealershipId)
  )
    return next(
      new ErrorResponse(
        `Unauthorized to activate the dealership '${dealership.name}'.`
      ),
      401
    );

  // activate the dealership
  const user = await User.findByIdAndUpdate(
    req.token.userId,
    {
      active_dealership_id: dealership._id.toString(),
    },
    {
      new: true,
      runValidators: true,
    }
  );

  console.log(user);
  if (!user)
    return next(
      new ErrorResponse("An error occured when updating the user model.", 500)
    );

  res.status(201).json(user);
});

async function isNameExists(accountId, name) {
  return await Dealership.exists({
    account_id: accountId,
    name,
    deletion_time: null,
  });
}

function convertBody(req) {
  return {
    name: req.body.name ? req.body.name.trim() : null,
    geocodedAddress: req.body.geocoded_address,
    formattedAddress: req.body.formatted_address,
    latitude: req.body.latitude,
    longitude: req.body.longitude,
  };
}

function validateBody(body) {
  const { name, geocodedAddress, formattedAddress, latitude, longitude } = body;

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
