const env = (process.env.NODE_ENV || 'dev').toString().trim()

module.exports = require(`./${env}.js`)
