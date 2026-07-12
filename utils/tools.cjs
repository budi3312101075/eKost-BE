const dayjs = require("dayjs");
const crypto = require("crypto");

const dateValue = () => {
  return dayjs().format("YYYY-MM-DD HH:mm:ss");
};

const uuid = () => {
  return crypto.randomUUID();
};

module.exports = {
  dateValue,
  uuid,
};