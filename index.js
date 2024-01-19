
const H = require('highland')
const R = require('ramda')
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const pkg = require('./package')
const app = express()
const server = require('http').createServer(app)

const config = require('./base-config')
let userConfig = Object.assign({}, config)

let socketIo
if (config.emitEvents) {
  socketIo = require('socket.io')(server, {
    allowEIO3: true,
    cors: {
      origin: 'http://surveyor-map.buildingshistory.co.uk',
      methods: ["GET", "POST"],
      credentials: false,
    }
  })
}

const oauth = require('./express-pg-oauth/index')
const db = require('./lib/db')
const queries = require('./lib/queries')
const serialize = require('./lib/serialize')

const PORT = process.env.PORT || 3011

app.use(cors({
  origin: true,
  credentials: true
}))

app.use(bodyParser.json({
  limit: '2mb'
}))

app.use(oauth(config, db.updateUserIds))


function send500 (res, err) {
  res.status(500).send({
    result: 'error',
    message: err.message
  })
}

function getParamValues (params) {
  return R.values(params)
}

function getParamIndexes (params) {
  return R.fromPairs(R.keys(params).map((key, i) => [key, i + 1]))
}

function getUserEmail (req) {
  return req && req.session && req.session.oauth &&
    req.session.oauth.data && req.session.oauth.data.email || ''
}

app.get('/', (req, res) => {
  res.send({
    title: pkg.description,
    version: pkg.version
  })
})

function sendItem (req, res, row) {
  if (!row) {
    res.status(404).send({
      result: 'error',
      message: 'Not found'
    })
  } else {
    res.send(serialize.item(row))
  }
}

app.get('/organizations', (req, res) => {
  db.executeQuery(queries.organizationsQuery, [], (err, rows) => {
    if (err) {
      send500(res, err)
      return
    }
    res.send(serialize.organizations(rows))
  })
})

app.get('/organizations/authorized', (req, res) => {
  const email = getUserEmail(req)
  db.executeQuery(queries.authorizedOrganizationsQuery, [email], (err, rows) => {
    if (err) {
      send500(res, err)
      return
    }
    res.send(serialize.organizations(rows))
  })
})

app.get('/collections', (req, res) => {
  db.executeQuery(queries.collectionsQuery, [], (err, rows) => {
    if (err) {
      send500(res, err)
      return
    }

    res.send(serialize.collections(rows))
  })
})

app.get('/collections/authorized', (req, res) => {
  const email = getUserEmail(req)
  db.executeQuery(queries.authorizedCollectionsQuery, [email], (err, rows) => {
    if (err) {
      send500(res, err)
      return
    }

    res.send(serialize.collections(rows))
  })
})

app.get('/tasks', (req, res) => {
  db.executeQuery(queries.tasksQuery, [], (err, rows) => {
    if (err) {
      send500(res, err)
      return
    }
    res.send(serialize.tasks(rows))
  })
})

app.get('/tasks/:taskId/collections', (req, res) => {
  const params = [req.params.taskId]
  const query = queries.makeCollectionsWithTaskQuery(queries.collectionsQuery, params)
  db.executeQuery(query, params, (err, rows) => {
    if (err) {
      send500(res, err)
      return
    }
    res.send(serialize.collections(rows))
  })
})

app.get('/tasks/:taskId/collections/authorized', (req, res) => {
  const email = getUserEmail(req)
  const params = [email, req.params.taskId]
  const query = queries.makeCollectionsWithTaskQuery(queries.authorizedCollectionsQuery, params)
  db.executeQuery(query, params, (err, rows) => {
    if (err) {
      send500(res, err)
      return
    }
    res.send(serialize.collections(rows))
  })
})

app.get('/tasks/:taskId/items', userAuthorizedForOrganizationsOrCollections, (req, res) => {
  const taskId = req.params.taskId
  const userId = req.session.user.id

  let params = {
    taskId, userId, limit: 50
  }

  const email = getUserEmail(req)
  if (email) {
    params = Object.assign(params, {email})
  }

  let organizations
  if (req.query && req.query.organization) {
    organizations = req.query.organization.split(',')
    params = Object.assign(params, {organizations})
  }

  let collections
  if (req.query && req.query.collection) {
    collections = req.query.collection.split(',')
    params = Object.assign(params, {collections})
  }

  const paramValues = getParamValues(params)
  const paramIndexes = getParamIndexes(params)

  let query = queries.makeAllItemsForTaskQuery(paramIndexes)
  query = queries.addCollectionsTasksGroupBy(query, paramIndexes)
  query = queries.addSubmissionForUser(query, paramIndexes)
  query = queries.addLimitAndOffset(query, paramIndexes)

  db.executeQuery(query, paramValues, (err, rows) => {
    if (err) {
      send500(res, err)
      return
    }

    res.send(serialize.items(rows))
  })
})

// TODO: see if ORDER BY RANDOM() LIMIT 1 scales
app.get('/tasks/:taskId/items/random', userAuthorizedForOrganizationsOrCollections, (req, res) => {
  const userId = req.session.user.id
  const taskId = req.params.taskId

  let params = {
    userId,
    taskId
  }

  const email = getUserEmail(req)
  if (email) {
    params = Object.assign(params, {email})
  }

  let organizations
  if (req.query && req.query.organization) {
    organizations = req.query.organization.split(',')
    params = Object.assign(params, {organizations})
  }

  let collections
  if (req.query && req.query.collection) {
    collections = req.query.collection.split(',')
    params = Object.assign(params, {collections})
  }

  const paramValues = getParamValues(params)
  const paramIndexes = getParamIndexes(params)

  // By default, a random item is returned for which submissions_needed is
  // not reached and which the user has not done already.
  // If anyRandomItem === true, a random item is returned, without these limitations.
  let anyRandomItem = false

  const anyRandomItemsources = [
    'chrome-tab',
    'digital-collections-tab',
    'tab'
  ]

  if (req.query['include-completed'] === 'true') {
    anyRandomItem = true
  } else if (req.query.source && anyRandomItemsources.includes(req.query.source)) {
    anyRandomItem = true
  }

  let query
  if (anyRandomItem) {
    query = queries.makeAnyRandomItemQuery(paramIndexes)
  } else {
    query = queries.makeRandomItemQuery(paramIndexes)
  }

  query = queries.addCollectionsTasksGroupBy(query)

  db.executeQuery(query, paramValues, (err, rows) => {
    if (err) {
      send500(res, err)
      return
    }
    sendItem(req, res, rows[0])
  })
})

app.get('/organizations/:organizationId/items/:itemId', userAuthorizedForOrganizationsOrCollections, (req, res) => {
  const userId = req.session.user.id
  const params = {
    organizationId: req.params.organizationId,
    itemId: req.params.itemId,
    userId
  }

  const paramValues = getParamValues(params)
  const paramIndexes = getParamIndexes(params)

  let query = queries.addCollectionsTasksGroupBy(queries.itemQuery)
  query = queries.addSubmissionForUser(query, paramIndexes)

  db.executeQuery(query, paramValues, (err, rows) => {
    if (err) {
      send500(res, err)
      return
    }
    sendItem(req, res, rows[0])
  })
})

function userAuthorizedForOrganizationsOrCollections (req, res, next) {
  let organizationIds
  const organizationId = req.params.organizationId ||
    (req.body && req.body.organization && req.body.organization.id)
  if (organizationId) {
    organizationIds = [organizationId]
  } else if (req.query && req.query.organization) {
    organizationIds = req.query.organization.split(',')
  }

  let collectionIds
  const collectionId = req.params.collectionId ||
    (req.body && req.body.collection && req.body.collection.id)
  if (collectionId) {
    collectionIds = [collectionId]
  } else if (req.query && req.query.collection) {
    collectionIds = req.query.collection.split(',')
  }

  if (!organizationIds && !collectionIds) {
    next()
    return
  }

  const email = getUserEmail(req)
  const query = queries.makeAuthorizedCollectionsQuery(organizationIds, collectionIds)

  const params = [email, organizationIds, collectionIds]
    .filter((param) => param !== undefined)

  db.executeQuery(query, params, (err, rows) => {
    if (err) {
      send500(res, err)
      return
    }

    if (rows.length === 0) {
      res.status(401).send({
        result: 'error',
        message: 'Unauthorized'
      })
    } else {
      next()
    }
  })
}

function itemExists (req, res, next) {
  const itemId = req.params.itemId ||
    (req.body && req.body.item && req.body.item.id)

  const organizationId = req.params.organizationId ||
    (req.body && req.body.organization && req.body.organization.id)

  db.itemExists(organizationId, itemId, (err, exists) => {
    if (err) {
      send500(res, err)
      return
    }

    if (exists) {
      next()
    } else {
      res.status(404).send({
        result: 'error',
        message: 'Not found'
      })
    }
  })
}

app.post('/submissions', userAuthorizedForOrganizationsOrCollections, itemExists, (req, res) => {
  let row = {
    organization_id: null,
    item_id: null,
    task_id: null,
    user_id: null,
    step: null,
    step_index: null,
    skipped: null,
    data: null,
    client: null
  }

  // POST data should contain:
  //     - item.id - string
  //     - organization.id - string
  //     - task.id - string
  //     - step - string (optional)
  //     - stepIndex (optional)
  //     - data - object
  //     - skipped - boolean
  //   if skipped == true,
  //     data should be undefined

  if (!req.body) {
    res.status(406).send({
      result: 'error',
      message: 'POST data should not be empty'
    })
    return
  }

  const body = req.body

  const itemId = body.item && body.item.id
  if (!itemId) {
    res.status(406).send({
      result: 'error',
      message: 'item.id not specified'
    })
    return
  }
  row.item_id = itemId

  const organizationId = body.organization && body.organization.id
  if (!organizationId) {
    res.status(406).send({
      result: 'error',
      message: 'organization.id not specified'
    })
    return
  }
  row.organization_id = organizationId

  const taskId = body.task && body.task.id
  if (!taskId) {
    res.status(406).send({
      result: 'error',
      message: 'No taskId specified'
    })
    return
  }
  row.task_id = taskId

  const hasData = body.data && R.keys(body.data).length
  if (body.skipped && !hasData) {
    row.skipped = true
  } else if (!body.skipped && hasData) {
    row.data = body.data
    row.skipped = false
  } else {
    res.status(406).send({
      result: 'error',
      message: 'Only completed steps should contain data - and skipped steps should not'
    })
    return
  }

  const DEFAULT_STEP = 'default'
  const DEFAULT_STEP_INDEX = 0

  // Check if step and stepIndex are present in body
  if (body.step && body.stepIndex >= 0) {
    row.step = body.step
    row.step_index = body.stepIndex
  } else {
    row.step = DEFAULT_STEP
    row.step_index = DEFAULT_STEP_INDEX
  }

  // Get user ID
  row.user_id = req.session.user.id

  // Get information about client
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
  const client = {
    ip: ip
  }
  row.client = JSON.stringify(client)

  const columns = R.keys(row)
  const placeholders = columns.map((column, i) => `$${i + 1}`)
  const values = placeholders.join(', ')

  const query = queries.makeInsertSubmissionQuery(columns, values)

  db.executeQuery(query, R.values(row), (err) => {
    if (err) {
      res.status(500).send({
        result: 'error',
        message: err.message
      })
    } else {
      if (config.emitEvents && !row.skipped) {
        emitSingleSubmission([
          row.organization_id,
          row.item_id,
          row.user_id,
          row.task_id,
          row.step
        ])
      }

      res.send({
        result: 'success'
      })
    }
  })
})

function emitSingleSubmission (values) {
  db.executeQuery(queries.singleSubmissionQuery, values, (err, rows) => {
    if (!err && rows.length === 1) {
      emitEvent('submission', serialize.submission(rows[0]))
    }
  })
}

function emitEvent (type, data) {
  if (socketIo) {
    socketIo.emit(type, data)
  }
}

app.get('/tasks/:taskId/submissions', (req, res) => {
  const taskId = req.params.taskId
  const userId = req.session.user.id
  const query = queries.makeSubmissionsQuery(userId)

  db.executeQuery(query, [taskId, req.session.user.id], (err, rows) => {
    if (err) {
      res.status(500).send({
        result: 'error',
        message: err.message
      })
    } else {
      res.send(serialize.submissions(rows))
    }
  })
})

app.get('/tasks/:taskId/submissions/all', (req, res) => {
  const taskId = req.params.taskId
  const query = queries.makeSubmissionsQuery(null, 1000)
  db.executeQuery(query, [taskId], (err, rows) => {
    if (err) {
      res.status(500).send({
        result: 'error',
        message: err.message
      })
    } else {
      res.send(serialize.submissions(rows))
    }
  })
})

app.get('/tasks/:taskId/submissions/all.ndjson', (req, res) => {
  const taskId = req.params.taskId
  const query = queries.makeSubmissionsQuery()

  db.streamQuery(query, [taskId], (err, stream) => {
    if (err) {
      send500(res, err)
      return
    }

    // res.type('application/x-ndjson')
    H(stream)
      .map(serialize.submission)
      .map(JSON.stringify)
      .intersperse('\n')
      .pipe(res)
  })
})

app.get('/tasks/:taskId/submissions/count', (req, res) => {
  const taskId = req.params.taskId
  const userId = req.session.user.id
  const query = queries.makeSubmissionsCountQuery(userId)

  db.executeQuery(query, [taskId, userId], (err, rows) => {
    if (err) {
      send500(res, err)
      return
    }

    const count = (rows[0] && rows[0].count) || 0
    res.send({
      completed: count
    })
  })
})

app.get('/organizations/:organizationId/collections', (req, res) => {
  db.executeQuery(queries.organizationCollectionsQuery, [req.params.organizationId], (err, rows) => {
    if (err) {
      send500(res, err)
      return
    }

    res.send(serialize.collections(rows))
  })
})

app.get('/organizations/:organizationId/collections/:collectionId', (req, res) => {
  const params = [req.params.organizationId, req.params.colletionId]
  db.executeQuery(queries.organizationCollectionQuery, params, (err, rows) => {
    if (err) {
      send500(res, err)
      return
    }

    const collection = rows[0]

    if (!collection) {
      res.status(404).send({
        result: 'error',
        message: 'Not found'
      })
      return
    }

    res.send(serialize.collection(collection))
  })
})


server.listen(PORT, () => {
  console.log(`${pkg.name} API listening on port ${PORT}!`)
})