const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  emitEvents: process.env.EMIT || false,
  defaults: {
    origin: process.env.SERVER_HOST,
    secret: process.env.SECRET
  },
  database: {
    url: `postgres://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
  },
  app: {
    name: process.env.APP_NAME,
    url: process.env.APP_URL,
  },
  twitter: {
    key: null,
    secret: null
  },
  facebook: {
    key: null,
    secret: null
  },
  google: {
    key: null,
    secret: null
  },
  github: {
    key: process.env.GITHUB_KEY,
    secret: process.env.GITHUB_SECRET,
  },

  port: process.env.PORT,
  node_env: process.env.NODE_ENV,
  db_host: process.env.DB_HOST,
  db_port: process.env.DB_PORT,
  db_user: process.env.DB_USER,
  db_pass: process.env.DB_PASS,
  db_name: process.env.DB_NAME,
}
