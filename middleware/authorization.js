const ErrorResponse = require("../error-response");
const asyncHandler = require("../async-handler");
const jwt = require("jsonwebtoken");

exports.protect = asyncHandler(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  )
    token = req.headers.authorization.split(" ")[1];

  if (!token) {
    return next(
      new ErrorResponse("Not authorized to access this endpoint.", 401)
    );
  }
  try {
    // validate the token
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

    req.token = decodedToken;
    next();
  } catch (error) {
    return next(
      new ErrorResponse("Not authorized to access this endpoint.", 401)
    );
  }
});

exports.isAdmin = asyncHandler(async (req, res, next) => {
  const token = req.token;

  if (!token) {
    return next(
      new ErrorResponse("Not authorized to access this endpoint.", 401)
    );
  }

  if (!token.isAccountAdmin) {
    return next(
      new ErrorResponse("Not authorized to access this endpoint.", 401)
    );
  }

  next();
});
