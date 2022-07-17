const ErrorResponse = require("../error-response");
const asyncHandler = require("../async-handler");
const Vehicle = require("../models/Vehicles");
const Dealership = require("../models/Dealerships");
const { invalidObjectId } = require("../validations");

// @desc        Get all vehicles for a specific dealership
// @route       GET /dealerships/{dealershipId}/vehicles
// @access      Authenticated
exports.getVehicles = asyncHandler(async (req, res, next) => {
  // validate the dealership ID
  if (invalidObjectId(req.params.dealershipId))
    return next(
      new ErrorResponse(
        `Dealership ID ${req.params.dealershipId} is not a valid ObjectId.`,
        400
      )
    );

  const vehicles = await Vehicle.find({
    dealership_id: req.params.dealershipId,
    deletion_time: null,
  });

  res.status(200).json(vehicles);
});

// @desc        Get a specific vehicle
// @route       GET /dealerships/{dealershipId}/vehicles/{vehicleId}
// @access      Private
exports.getVehicle = asyncHandler(async (req, res, next) => {
  // validate the dealership ID
  if (invalidObjectId(req.params.dealershipId))
    return next(
      new ErrorResponse(
        `Dealership ID ${req.params.dealershipId} is not a valid ObjectId.`,
        400
      )
    );

  // validate the vehicle ID
  if (invalidObjectId(req.params.vehicleId))
    return next(
      new ErrorResponse(
        `Vehicle ID ${req.params.vehicleId} is not a valid ObjectId.`,
        400
      )
    );

  const vehicle = await Vehicle.findOne({
    _id: req.params.vehicleId,
    dealership_id: req.params.dealershipId,
    deletion_time: null,
  });

  if (!vehicle) {
    return next(
      new ErrorResponse(
        `Vehicle with id ${req.params.vehicleId} not found.`,
        404
      )
    );
  }

  res.status(200).json(vehicle);
});

// @desc        Update a specific vehicle
// @route       PUT /dealerships/{dealershipId}/vehicles/{vehicleId}
// @access      Authenticated
exports.updateVehicle = asyncHandler(async (req, res, next) => {
  // clean data
  const vin = req.body.vin;
  const onRoadSince = req.body.on_road_since;
  const status = req.body.status;
  const hasLocation = req.body.location ? true : false;
  const locationId = hasLocation ? req.body.location.location_id : null;
  const latitude = hasLocation ? req.body.location.latitude : null;
  const longitude = hasLocation ? req.body.location.longitude : null;
  // TODO: validate each property to make sure they exist
  const properties = req.body.properties;

  // validate the dealership ID
  if (invalidObjectId(req.params.dealershipId))
    return next(
      new ErrorResponse(
        `Dealership ID ${req.params.dealershipId} is not a valid ObjectId.`,
        400
      )
    );

  // validate the vehicle ID
  if (invalidObjectId(req.params.vehicleId))
    return next(
      new ErrorResponse(
        `Vehicle ID ${req.params.vehicleId} is not a valid ObjectId.`,
        400
      )
    );

  const vehicleUpdate = {
    vin,
    on_road_since: onRoadSince,
    status,
    location: hasLocation
      ? {
          location_id: locationId,
          latitude: latitude,
          longitude: longitude,
        }
      : null,
    properties,
  };

  console.log(vehicleUpdate);

  // try to update the vehicle
  const update = await Vehicle.updateOne(
    {
      _id: req.params.vehicleId,
      dealership_id: req.params.dealershipId,
      deletion_time: null,
    },
    vehicleUpdate,
    {
      runValidators: true,
      new: true,
    }
  );

  // throw error if no vehicle returned
  if (update.modifiedCount !== 1) {
    return next(
      new ErrorResponse(
        `Vehicle with id ${req.params.vehicleId} was unable to be updated.`,
        404
      )
    );
  }

  // return data
  res.status(200).json(await Vehicle.findById(req.params.vehicleId));
});

// @desc        Create a specific vehicle
// @route       POST /dealerships/{dealershipId}/vehicles
// @access      Authenticated
exports.createVehicle = asyncHandler(async (req, res, next) => {
  // clean data
  const vin = req.body.vin;
  const onRoadSince = req.body.on_road_since;
  const status = req.body.status;
  const hasLocation = req.body.location ? true : false;
  const locationId = hasLocation ? req.body.location.location_id : null;
  const latitude = hasLocation ? req.body.location.latitude : null;
  const longitude = hasLocation ? req.body.location.longitude : null;
  // TODO: validate each property to make sure they exist
  const properties = req.body.properties;

  // validate the dealership ID
  if (invalidObjectId(req.params.dealershipId))
    return next(
      new ErrorResponse(
        `Dealership ID ${req.params.dealershipId} is not a valid ObjectId.`,
        400
      )
    );

  const vehicleCreation = {
    dealership_id: req.params.dealershipId,
    vin,
    on_road_since: onRoadSince,
    status,
    location: hasLocation
      ? {
          location_id: locationId,
          latitude: latitude,
          longitude: longitude,
        }
      : null,
    properties,
  };

  // try to create the new vehicle
  const vehicle = await Vehicle.create(vehicleCreation);

  // throw error if no vehicle returned
  if (!vehicle) {
    return next(
      new ErrorResponse(
        "A problem occured during the creation of the vehicle.",
        404
      )
    );
  }

  // return a success response
  res.status(201).json(vehicle);
});

// @desc        Delete a specific vehicle
// @route       DELETE /dealerships/{dealershipId}/vehicles/{vehicleId}
// @access      Authenticated
exports.deleteVehicle = asyncHandler(async (req, res, next) => {
  // validate the dealership ID
  if (invalidObjectId(req.params.dealershipId))
    return next(
      new ErrorResponse(
        `Dealership ID ${req.params.dealershipId} is not a valid ObjectId.`,
        400
      )
    );

  // validate the vehicle ID
  if (invalidObjectId(req.params.vehicleId))
    return next(
      new ErrorResponse(
        `Vehicle ID ${req.params.vehicleId} is not a valid ObjectId.`,
        400
      )
    );

  // try to update the vehicle
  const vehicle = await Vehicle.updateOne(
    {
      _id: req.params.vehicleId,
      dealership_id: req.params.dealershipId,
      deletion_time: null,
    },
    {
      deletion_time: new Date().getTime(),
    },
    {
      runValidators: true,
      new: true,
    }
  );

  // throw error if no vehicle returned
  if (!vehicle) {
    return next(
      new ErrorResponse(
        `Vehicle with id ${req.params.vehicleId} was unable to be deleted.`,
        404
      )
    );
  }

  // return data
  res.status(200).json({});
});
