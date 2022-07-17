const ErrorResponse = require("../error-response");
const asyncHandler = require("../async-handler");
const Account = require("../models/Accounts");

exports.createAccount = asyncHandler(async (req, res, next) => {
  // clean data
  const domain = req.body.domain ? req.body.domain.trim().toUpperCase() : null;
  const enabled = req.body.enabled ? req.body.enabled : true;

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
