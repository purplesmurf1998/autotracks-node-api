const ErrorResponse = require("../error-response");
const asyncHandler = require("../async-handler");
const Property = require("../models/Properties");
const PropertyConfig = require("../models/PropertyConfigs");
const {
  invalidObjectId,
  requiredString,
  maxStringLength,
  invalidEmail,
  requiredObject,
  requiredEnum,
} = require("../validations");

// @desc        Create a new vehicle property model
// @route       POST /dealerships/{dealershipId}/properties
// @access      Private
exports.createProperty = asyncHandler(async (req, res, next) => {
  // validate body
  const body = convertBody(req);
  const validationError = validateBody(body);
  if (validationError) return next(validationError);

  // validate the dealership ID
  if (invalidObjectId(req.params.dealershipId))
    return next(
      new ErrorResponse(
        `Dealership ID ${req.params.dealershipId} is not a valid ObjectId.`,
        400
      )
    );

  // create the key
  const key = body.label.replace(
    /(?:^\w|[A-Z]|\b\w|\s+)/g,
    function (match, index) {
      if (+match === 0) return "";
      return index === 0 ? match.toLowerCase() : match.toUpperCase();
    }
  );

  const propertyCreation = {
    dealership_id: req.params.dealershipId,
    label: body.label,
    key,
    input_type: body.inputType,
    dropdown_options:
      body.inputType === "Dropdown" ? body.dropdownOptions : null,
    is_required: body.isRequired,
  };

  const property = await Property.create(propertyCreation);

  if (!property)
    return next(
      new ErrorResponse(
        "A problem occured during the creation of the property.",
        500
      )
    );

  // add the property to property configs for this dealership
  const configs = await PropertyConfig.find({
    dealership_id: property.dealership_id,
  });
  for (let i = 0; i < configs.length; i++) {
    let config = configs[i];
    const newOrderIndex = {
      property_id: property._id,
      visible: true,
    };
    config.property_order.push(newOrderIndex);
    config.save();
  }

  // add the property to vehicle properties for this dealership
  // let vehicles = await Vehicles.find({ dealership: dealership._id });

  // for (let i = 0; i < vehicles.length; i++) {
  //   let tempVehicle = vehicles[i];
  //   tempVehicle.properties[property.key] = {
  //     label: property.label,
  //     value: null,
  //     input_type: property.input_type,
  //   };
  //   await Vehicles.findByIdAndUpdate(tempVehicle._id, {
  //     properties: tempVehicle.properties,
  //   });
  // }

  res.status(201).json(property);
});

// @desc    Get dealership properties
// @route   POST /dealerships/{dealershipId}/properties
// @access  Authenticated
exports.getProperties = asyncHandler(async (req, res, next) => {
  // get the formatted query based on the advnaced filtering
  const properties = await Property.find({
    dealership_id: req.params.dealershipId,
    deletion_time: null,
  });

  res.status(200).json(properties);
});

// @desc        Update a vehicle property model
// @route       PUT /dealerships/{dealershipId}/properties/{propertyId}
// @access      Private
exports.updateProperty = asyncHandler(async (req, res, next) => {
  // validate body
  const body = convertBody(req);
  const validationError = validateBody(body);
  if (validationError) return next(validationError);

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
  const key = body.label.replace(
    /(?:^\w|[A-Z]|\b\w|\s+)/g,
    function (match, index) {
      if (+match === 0) return "";
      return index === 0 ? match.toLowerCase() : match.toUpperCase();
    }
  );

  const propertyCreation = {
    dealership_id: req.params.dealershipId,
    label: body.label,
    key,
    input_type: body.inputType,
    dropdown_options:
      body.inputType === "Dropdown" ? body.dropdownOptions : null,
    is_required: body.isRequired,
  };

  const property = await Property.findByIdAndUpdate(
    req.params.propertyId,
    propertyCreation,
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

  // add the property to vehicle properties for this dealership
  // let vehicles = await Vehicles.find({ dealership: dealership._id });

  // for (let i = 0; i < vehicles.length; i++) {
  //   let tempVehicle = vehicles[i];
  //   tempVehicle.properties[property.key] = {
  //     label: property.label,
  //     value: null,
  //     input_type: property.input_type,
  //   };
  //   await Vehicles.findByIdAndUpdate(tempVehicle._id, {
  //     properties: tempVehicle.properties,
  //   });
  // }

  res.status(201).json(property);
});

function convertBody(req) {
  return {
    label: req.body.label,
    inputType: req.body.input_type,
    dropdownOptions: req.body.dropdown_options,
    isRequired: req.body.is_required ? true : false,
  };
}

function validateBody(body) {
  const { label, inputType, dropdownOptions } = body;

  // validate displayName
  if (requiredString(label))
    return new ErrorResponse(`Label not provided.`, 400);

  // validate email address
  if (requiredString(inputType))
    return new ErrorResponse(`Input type not provided.`, 400);
  if (
    requiredEnum(
      inputType,
      "Text",
      "Number",
      "Currency",
      "Date",
      "Dropdown",
      "List"
    )
  )
    return new ErrorResponse(
      `Input type ${inputType} is not a valid type.`,
      400
    );

  // validate activeDealershipId with isAccountAdmin
  if (
    (!dropdownOptions || dropdownOptions.length === 0) &&
    inputType === "Dropdown"
  )
    return new ErrorResponse(
      `A property with input type 'Dropdown' must have dropdown options.`,
      400
    );

  // all validations passed
  return null;
}
