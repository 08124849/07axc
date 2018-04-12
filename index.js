const express = require('express')
    , router = express.Router()
    , bodyParser = require('body-parser')
    , fs = require('fs')
    , passport = require('passport')
    , jwt = require('jsonwebtoken')
    , utils = require('./utils')
    , api = require('./api')

let config = utils.readConfig()
  , dbCrm = utils.createDbConn(config.database.crm)
  , dbMail = utils.createDbConn(config.database.mail_srv)
  , app = express()

utils.authJWT(passport, config.jwt, dbCrm)
router.use(function(req, res, next) {
  let token = req.headers['x-auth-token'] || '';

  jwt.verify(token, config.jwt.secretOrKey, {
    algorithms: [ config.jwt.algorithm ]
  }, function(err, decoded) {
    if (err) {
      res
        .status(401)
        .json({
          success: false,
          message: err
        })
    } else {
      next()
    }
  })
})

api(router)

app
  .use('/attachments', express.static('./attachments'))
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({ extended: true }))
  .use(passport.initialize())
  .use(utils.dbMiddleware(dbMail))
  .use('/api', router)
  .post('/auth', utils.authController(dbCrm, config.jwt))

app.listen(config.app.port, function(err) {
  if (err) {
    console.log(err)
  } else {
    console.log('[OK] Application Running on port: ' + config.app.port)
  }
})
