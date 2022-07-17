const ErrorResponse = require("../error-response");
const asyncHandler = require("../async-handler");
const Property = require("../models/Properties");
const PropertyConfig = require("../models/PropertyConfigs");
const Vehicle = require("../models/Vehicles");
const { invalidObjectId } = require("../validations");

// @desc        Create a new vehicle property model
// @route       POST /dealerships/{dealershipId}/properties
// @access      Private
exports.createProperty = asyncHandler(async (req, res, next) => {
  // clean data
  const label = req.body.label.trim();
  const inputType = req.body.input_type;
  const dropdownOptions = req.body.dropdown_options;
  const isRequired = req.body.is_required ? true : false;

  // validate the dealership ID
  if (invalidObjectId(req.params.dealershipId))
    return next(
      new ErrorResponse(
        `Dealership ID ${req.params.dealershipId} is not a valid ObjectId.`,
        400
      )
    );

  // create the key
  const key = label.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function (match, index) {
    if (+match === 0) return "";
    return index === 0 ? match.toLowerCase() : match.toUpperCase();
  });

  const propertyCreation = {
    dealership_id: req.params.dealershipId,
    label,
    key,
    input_type: inputType,
    dropdown_options: inputType === "Dropdown" ? dropdownOptions : null,
    is_required: isRequired,
  };

  const property = await Property.create(propertyCreation);

  if (!property)
    return next(
      new ErrorResponse(
        "A problem occured during the creation of the property.",
        500
      )
    );

  // add the property to all property configs for this dealership
  const configs = await PropertyConfig.find({
    dealership_id: property.dealership_id,
    deletion_time: null,
  });
  for (let i = 0; i < configs.length; i++) {
    const newOrderIndex = {
      property_id: property._id,
      visible: true,
    };
    configs[i].property_order.push(newOrderIndex);
    configs[i].save();
  }

  // add the property to vehicle properties of all existing vehicles for this dealership
  let vehicles = await Vehicle.find({
    dealership_id: property.dealership_id,
    deletion_time: null,
  });

  for (let i = 0; i < vehicles.length; i++) {
    let vehicle = vehicles[i];
    vehicle.properties[property.key] = {
      label: property.label,
      value: null,
      input_type: property.input_type,
    };
    await Vehicle.findByIdAndUpdate(vehicle._id, {
      properties: vehicle.properties,
    });
  }

  res.status(201).json(property);
});

// @desc    Get dealership properties
// @route   GET /dealerships/{dealershipId}/properties
// @access  Authenticated
exports.getProperties = asyncHandler(async (req, res, next) => {
  // validate the dealership ID
  if (invalidObjectId(req.params.dealershipId))
    return next(
      new ErrorResponse(
        `Dealership ID ${req.params.dealershipId} is not a valid ObjectId.`,
        400
      )
    );

  // get the formatted query based on the advnaced filtering
  const properties = await Property.find({
    dealership_id: req.params.dealershipId,
  });

  res.status(200).json(properties);
});

// @desc        Update a vehicle property model
// @route       PUT /dealerships/{dealershipId}/properties/{propertyId}
// @access      Private
exports.updateProperty = asyncHandler(async (req, res, next) => {
  // clean data
  const label = req.body.label.trim();
  const inputType = req.body.input_type;
  const dropdownOptions = req.body.dropdown_options;
  const isRequired = req.body.is_required ? true : false;

  // validate the dealership ID
  if (invalidObjectId(req.params.dealershipId))
    return next(
      new ErrorResponse(
        `Dealership ID ${req.params.dealershipId} is not a valid ObjectId.`,
        400
      )
    );

  // validate the property ID
  if (invalidObjectId(req.params.propertyId))
    return next(
      new ErrorResponse(
        `Property ID ${req.params.propertyId} is not a valid ObjectId.`,
        400
      )
    );

  // create the key
  const key = label.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function (match, index) {
    if (+match === 0) return "";
    return index === 0 ? match.toLowerCase() : match.toUpperCase();
  });

  const propertyUpdate = {
    dealership_id: req.params.dealershipId,
    label,
    key,
    input_type: inputType,
    dropdown_options: inputType === "Dropdown" ? dropdownOptions : null,
    is_required: isRequired,
  };

  const property = await Property.findByIdAndUpdate(
    req.params.propertyId,
    propertyUpdate,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!property)
    return next(
      new ErrorResponse(
        "A problem occured during the creation of the property.",
        500
      )
    );

  res.status(201).json(property);
});

// @desc        Delete a vehicle property model
// @route       DELETE /dealerships/{dealershipId}/properties/{propertyId}
// @access      Private
exports.deleteProperty = asyncHandler(async (req, res, next) => {
  // validate the dealership ID
  if (invalidObjectId(req.params.dealershipId))
    return next(
      new ErrorResponse(
        `Dealership ID ${req.params.dealershipId} is not a valid ObjectId.`,
        400
      )
    );

  // validate the property ID
  if (invalidObjectId(req.params.propertyId))
    return next(
      new ErrorResponse(
        `Property ID ${req.params.propertyId} is not a valid ObjectId.`,
        400
      )
    );

  // find the propoerty
  const property = await Property.findOne({
    _id: req.params.propertyId,
    dealership_id: req.params.dealershipId,
  });
  if (!property)
    return next(
      new ErrorResponse(
        `Property with ID '${req.params.propertyId}' not found.`,
        404
      )
    );

  // remove the property from the property configs related to the dealership
  const configs = await PropertyConfig.find({
    dealership_id: req.params.dealershipId,
  });
  for (let i = 0; i < configs.length; i++) {
    let config = configs[i];
    let propIndex = config.property_order.findIndex(
      (prop) => prop.property_id.toString() === req.params.propertyId
    );
    if (propIndex >= 0) {
      config.property_order.splice(propIndex, 1);
      config.save();
    }
  }

  // remove the property from the property configs related to the dealership
  const vehicles = await Vehicle.find({
    dealershio_id: req.params.dealershipId,
    deletion_time: null,
  });
  for (let i = 0; i < vehicles.length; i++) {
    let vehicle = vehicles[i];
    delete vehicle.properties[property.key];
    await Vehicle.findByIdAndUpdate(vehicle._id, {
      properties: vehicle.properties,
    });
  }

  property.delete();

  res.status(200).json({});
});
