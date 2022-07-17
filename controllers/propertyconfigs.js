const ErrorResponse = require("../error-response");
const asyncHandler = require("../async-handler");
const Property = require("../models/Properties");
const PropertyConfig = require("../models/PropertyConfigs");
const {
  invalidObjectId,
  requiredString,
  maxStringLength,
  requiredObject,
} = require("../validations");

// @desc        Get property config for the user and dealership
// @route       POST /dealerships/{dealershipId}/property-configs
// @access      Authenticated
exports.getPropertyConfig = asyncHandler(async (req, res, next) => {
  // validate the dealership ID
  if (invalidObjectId(req.params.dealershipId))
    return next(
      new ErrorResponse(
        `Dealership ID ${req.params.dealershipId} is not a valid ObjectId.`,
        400
      )
    );

  // grab the user ID from the token
  const userId = req.token.userId;

  const config = await PropertyConfig.findOne({
    dealership_id: req.params.dealershipId,
    user_id: userId,
  }).populate({ path: "property_order", populate: { path: "property_id" } });

  if (!config) {
    return next(
      new ErrorResponse(
        `Vehicle property order not found with for user with ID ${userId}`,
        404
      )
    );
  }

  res.status(200).json(config);
});

// @desc        Update the position of all vehicle properties in batch
// @route       PUT /dealerships/{dealershipId}/property-configs/{propertyConfigId}/order
// @access      Authenticated
exports.updatePropertyOrder = asyncHandler(async (req, res, next) => {
  // find vehicle property order model to update
  const config = await PropertyConfig.findByIdAndUpdate(
    req.params.propertyConfigId,
    req.body,
    {
      new: true,
      runValidators: true,
    }
  );

  // return data
  res.status(200).json(config);
});
