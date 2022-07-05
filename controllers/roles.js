const Role = require("../models/Roles");
const ErrorResponse = require("../error-response");
const asyncHandler = require("../async-handler");
const {
  invalidObjectId,
  requiredString,
  maxStringLength,
  invalidEmail,
} = require("../validations");
const defaultPermissions = [
  {
    resource: "vehicle",
    policy: {
      create: false,
      read: false,
      update: false,
      delete: false,
    },
  },
  {
    resource: "location",
    policy: {
      create: false,
      read: false,
      update: false,
      delete: false,
    },
  },
  {
    resource: "user",
    policy: {
      create: false,
      read: false,
      update: false,
      delete: false,
    },
  },
  {
    resource: "account",
    policy: {
      create: false,
      read: false,
      update: false,
      delete: false,
    },
  },
  {
    resource: "vehicle_property",
    policy: {
      create: false,
      read: false,
      update: false,
      delete: false,
    },
  },
  {
    resource: "dealership",
    policy: {
      create: false,
      read: false,
      update: false,
      delete: false,
    },
  },
];

// @desc    Create a role for a specific dealership
// @route   POST /accounts/{accountId}/dealerships/{dealershipId}/roles
// @access  Protected
exports.createRole = asyncHandler(async (req, res, next) => {
  // validate body
  const body = convertBody(req);
  const validationError = validateError(body);
  if (validationError) return next(validationError);

  // validate account ID
  if (invalidObjectId(req.params.accountId))
    return new ErrorResponse(
      `Account ID ${req.params.accountId} is not a valid ObjectId.`,
      400
    );

  // validate dealership ID
  if (invalidObjectId(req.params.dealershipId))
    return new ErrorResponse(
      `Dealership ID ${req.params.dealershipId} is not a valid ObjectId.`,
      400
    );

  // if no permissions defined, initialize permissions to an empty array
  let tempPermissions = req.body.permissions || [];
  let rolePermissions = defaultPermissions;

  rolePermissions.forEach((value) => {
    const resource = value.resource;
    Object.keys(value.policy).forEach((key) => {
      if (tempPermissions.includes(key + "_" + resource)) {
        value.policy[key] = true;
      }
    });
  });

  const roleCreation = {
    account_id: req.params.accountId,
    dealership_id: req.params.dealershipId,
    title: body.title,
    permissions: rolePermissions,
  };

  const role = await Role.create(roleCreation);

  if (!role) {
    return next(
      new ErrorResponse(
        "A problem occured during the creation of the user.",
        500
      )
    );
  }

  // send response
  res.status(201).json(role);
});

function convertBody(req) {
  return {
    title: req.body.title ? req.body.title.trim() : null,
  };
}

function validateError(body) {
  const { title } = body;

  // validate title
  if (requiredString(title))
    return new ErrorResponse(`Display name not provided.`, 400);

  // all validations passed
  return null;
}
