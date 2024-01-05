// Common db connector for tests

if (!process.env.BRICK_BY_BRICK_API_CONFIG) throw new Error('Environment variable BRICK_BY_BRICK_API_CONFIG is not set.')
if (process.env.NODE_ENV !== 'test') throw new Error('Tests must be run with NODE_ENV=test')

// Require a test config file to avoid wiping non-test data
// Assume test config path is default config path but with .test before extension
// e.g. .config.test.json
var configPath = process.env.BRICK_BY_BRICK_API_CONFIG.replace(/(\.json)?$/, '.test$1')
var config
try {
  config = require(configPath)
} catch (e) {
  throw new Error('No test config found: ' + configPath)
}

module.exports.db = require('../lib/db')(config)
