# <img src="bricks.gif"/> Space/Time Directory - brick-by-brick <img src="bricks.gif"/>

## Notes

1. Brick by brick didn't work on version 14.x and up
2. Brick by brick need low node version (7.10.1)
3. I install node in that version, but still did not work
4. Running on version 10.x also not work

5. Inspecting code:
- App can run by skiping several code (comment // const argv = require('minimist')(process.argv.slice(2)) , and line 16 until 60)
- Trying get /organizations on my browser, no work, only loading
- Warning appear: PG.connect is deprecated - please see the upgrade guide at https://node-postgres.com/guides/upgrading

Looking for the cause
- Upgrading postgre pg.connect by folowing https://node-postgres.com/guides/upgrading
- Warning still appear

6. Creating fresh Express app with node v 20.x
7. Clone some code on brick-by-brick to new Express app
- Warning still appear
- Skipping // app.use(oauth(config, db.updateUserIds))
- get /organizations on my browser and IT WORKS
- Warning message does not appear
- So The cause on express-pg-oauth library. WE MUST UPDATE THESE LIBRARY THAT USE DEPRECATED PG.CONNECT connection method (https://node-postgres.com/guides/upgrading)

8. Change express-pg-oauth to github:nypl-spacetime/express-pg-oauth also did not work.
9. Now I have new repo with node v 20.x the name is b-by-b

## Running B-BY-B Server
1. Clone this `git clone https://github.com/buildvoc/brick-by-brick.git`
2. Checkout to b-by-b branch `git checkout b-by-b`
3. Run `npm install`
4. Run this b-by-b app `npm start`
5. This error will appear 
`

brick-by-brick API listening on port 3011!
node:internal/process/promises:289
            triggerUncaughtException(err, true /* fromPromise */);
            ^

AggregateError
    at internalConnectMultiple (node:net:1114:18)
    at afterConnectMultiple (node:net:1667:5) {
  code: 'ECONNREFUSED',
  [errors]: [
    Error: connect ECONNREFUSED ::1:80
        at createConnectionError (node:net:1634:14)
        at afterConnectMultiple (node:net:1664:40) {
      errno: -4078,
      code: 'ECONNREFUSED',
      syscall: 'connect',
      address: '::1',
      port: 80
    },
    Error: connect ECONNREFUSED 127.0.0.1:80
        at createConnectionError (node:net:1634:14)
        at afterConnectMultiple (node:net:1664:40) {
      errno: -4078,
      code: 'ECONNREFUSED',
      syscall: 'connect',
      address: '127.0.0.1',
      port: 80
    }
  ]
}

Node.js v20.9.0
[nodemon] app crashed - waiting for file changes before starting...

`

6. Error will not shown If you comment on the line 64 on index.js file. This action is disabling oauth.
7. This bug has fixed after modifying `express-pg-oauth` library, and embed on this repo.

## Running B-BY-B Server (After modifications)
1. Clone this `git clone https://github.com/buildvoc/brick-by-brick.git`
2. Run `cd brick-by-brick`
3. Checkout to b-by-b branch `git checkout b-by-b`
4. Run `npm install`
5. Run `cd express-pg-oauth`
6. Run `npm install` again in `express-pg-oauth` directory
7. Back to `brick-by-brick` by running `cd brick-by-brick`
8. Run this b-by-b app `npm start`