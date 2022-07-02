const ErrorResponse = require("../error-response");
const asyncHandler = require("../async-handler");
const Account = require("../models/Accounts");
const {
  requiredString,
  maxStringLength,
  minStringLength,
} = require("../validations");
const DOMAIN_MAX_LENGTH = 50;
const DOMAIN_MIN_LENGTH = 5;

exports.createAccount = asyncHandler(async (req, res, next) => {
  // clean data
  const domain = req.body.domain ? req.body.domain.trim() : null;
  const enabled = req.body.enabled ? req.body.enabled : true;

  // validate request body
  if (requiredString(domain))
    return next(new ErrorResponse("Account domain not provided.", 400));

  if (maxStringLength(domain, DOMAIN_MAX_LENGTH))
    return next(
      new ErrorResponse(
        `Account domain too long. Must be less than or equal to ${DOMAIN_MAX_LENGTH} characters.`,
        400
      )
    );

  if (minStringLength(domain, DOMAIN_MIN_LENGTH))
    return next(
      new ErrorResponse(
        `Account domain too short. Must be greater than or equal to ${DOMAIN_MIN_LENGTH} characters.`,
        400
      )
    );

  // verify if account name already exists or not
  if (await isAccountDomainExists(domain))
    return next(
      new ErrorResponse(`Account with domain '${domain}' already exists.`, 400)
    );

  // build account creation object
  const accountCreation = {
    domain,
    enabled,
  };

  const account = await Account.create(accountCreation);

  // make sure the account has been created
  if (!account)
    return next(
      new ErrorResponse(
        "A problem occured during the creation of the account.",
        500
      )
    );

  req.account = account;
  next(null);
});

async function isAccountDomainExists(domain) {
  return await Account.exists({ domain: domain });
}
