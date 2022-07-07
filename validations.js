const ObjectId = require("mongoose").Types.ObjectId;

exports.requiredString = (val) => {
  return !val || val.trim() === "";
};

exports.requiredObject = (obj) => {
  return !obj;
};

exports.maxStringLength = (val, max) => {
  return val.length > max;
};

exports.minStringLength = (val, min) => {
  return val.length < min;
};

exports.invalidObjectId = (val) => {
  const id = new ObjectId(val);
  return id.toString() !== val;
};

exports.invalidEmail = (val) => {
  return !val.match(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/);
};

exports.requiredEnum = (val, ...enums) => {
  return [...enums].indexOf(val) < 0;
};
