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
const { invalidObjectId, requiredString } = require("../validations");

// @desc    Create a new dealership
// @route   POST /dealerships
// @access  Authenticated
exports.createDealership = asyncHandler(async (req, res, next) => {
  // clean data
  const name = req.body.name ? req.body.name.trim() : null;
  const geocodedAddress = req.body.geocoded_address;
  const formattedAddress = req.body.formatted_address;
  const latitude = req.body.latitude;
  const longitude = req.body.longitude;

  // validate the account ID
  if (invalidObjectId(req.params.accountId))
    return next(
      new ErrorResponse(
        `Account ID ${req.params.accountId} is not a valid ObjectId.`,
        400
      )
    );

  // validate the dealership name doesn't exist
  if (await isNameExists(req.params.accountId, name))
    return next(
      new ErrorResponse(
        `Dealership with name '${body.name}' already exists for this account.`,
        400
      )
    );

  const dealershipCreation = {
    name,
    geocoded_address: geocodedAddress,
    formatted_address: formattedAddress,
    latitude,
    longitude,
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
  const userIds = req.body.user_ids;
  if (userIds && userIds.length > 0) {
    for (let i = 0; i < userIds.length; i++) {
      // 1. find the user and add the dealership id in their allowed_dealership_ids list
      let user = await User.findOne({ _id: userIds[i], deletion_time: null });
      if (!user) continue;
      let allowedDealershipIds = user.allowed_dealership_ids
        ? user.allowed_dealership_ids
        : [];
      allowedDealershipIds.push(dealership._id.toString());
      user.allowed_dealership_ids = allowedDealershipIds;
      await user.save();

      // 2. create their property config for this dealership
      const config = {
        account_id: dealership.account_id.toString(),
        dealership_id: dealership._id.toString(),
        user_id: user._id.toString(),
        property_order: [],
        property_group_by_ids: null,
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
        property_group_by_ids: null,
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
// @route   GET /accounts/{accountId}/dealerships/{dealershipId}
// @access  Authenticated
exports.getDealership = asyncHandler(async (req, res, next) => {
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

  // run query in mongoose
  const dealership = await Dealership.findOne({
    _id: req.params.dealershipId,
    account_id: req.params.accountId,
    deletion_time: null,
  });

  if (!dealership) {
    return next(
      new ErrorResponse(
        `Dealership with ID '${req.params.dealershipId}' not found.`,
        404
      )
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
// @route   POST accounts/{accountId}/dealerships/{dealershipId}/activate
// @access  Private
exports.activateDealership = asyncHandler(async (req, res, next) => {
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
