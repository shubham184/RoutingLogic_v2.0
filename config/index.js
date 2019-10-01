/* eslint linebreak-style: ["error", "windows"] */
const env = (process.env.NODE_ENV || "dev").toString().trim();
// eslint-disable-next-line import/no-dynamic-require
module.exports = require(`./${env}.js`);
