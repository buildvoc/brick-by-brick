var R = require('ramda')

const baseConfig = {
  defaults: {
    transport: 'session',
    state: true,
    prefix: "/oauth/connect"
  },
  twitter: {
    title: 'Twitter',
    purest: {
      get: 'account/verify_credentials',
      authInConstructor: true,
      data: (body) => ({
        name: body.name,
        url: `https://twitter.com/${body.screen_name}`
      })
    }
  },
  facebook: {
    title: 'Facebook',
    scope: ['email'],
    purest: {
      get: 'me',
      data: (body) => ({
        name: body.name,
        url: `https://www.facebook.com/${body.id}`
      })
    }
  },
  google: {
    title: 'Google',
    scope: ['profile'],
    purest: {
      query: 'plus',
      get: 'people/me',
      data: (body) => ({
        name: body.displayName
      })
    }
  },
  github: {
    title: 'GitHub',
    purest: {
      get: 'user',
      data: (body) => ({
        name: body.name,
        url: body.html_url
      })
    }
  }
}

module.exports = (config) => R.fromPairs(Object.keys(config)
  .map((key) => [key, Object.assign(config[key], baseConfig[key])]))
