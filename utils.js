const fs = require('fs')
    , path = require('path')
    , yaml = require('js-yaml')
    , passportJWT = require('passport-jwt')
    , jwt = require('jsonwebtoken')
    , Pool = require('pg').Pool
    , JWTStrategy = passportJWT.Strategy
    , ExtractJWT = passportJWT.ExtractJwt
    , bcrypt = require('bcrypt')
    
let Utils = exports

Utils.readConfig = function(file) {
  try {
    let configPath = path.join(__dirname, 'config.yml')
    var doc = yaml.safeLoad(fs.readFileSync(configPath, 'utf8'))
    return doc
  } catch(e) {
    throw e
  }
}

Utils.authJWT = function(passport, conf, db) {
  conf.jwtFromRequest = ExtractJWT.fromHeader(conf.headerKey);

  passport.use(new JWTStrategy(conf, function(payload, cb) {
    db.query("SELECT * FROM staff WHERE id=?", [payload.id])
      .then(function(res) {
        if (!res.rows && !res.rows.length) {
          cb(new Error("No user found"))
        } else {
          cb(null, res.rows[0])
        }
      })
  }))
}

Utils.createDbConn = function(conf) {
  return new Pool(conf)
}

Utils.dbMiddleware = function(db) {
  return function(req, res, next) { 
    req.db = db 
    next()
  }
}

Utils.authController = function(db, conf) {
  return function(req, response) {
    db.query('SELECT * FROM staff WHERE username=$1', [req.body.username])
      .then(function(res) {
        if (!res.rows.length) {
          response
            .status(401)
            .json({
              success: false,
              message: 'Unauthorized'            
            })
        } else {
          let row = res.rows[0]
          bcrypt.compare(req.body.password, row.password, function(error, match) {
            if (error) {
              response
                .status(401)
                .json({
                  success: false,
                  message: 'Unauthorized'
                })
            } else {
              let token = jwt.sign({
                data: row
              }, conf.secretOrKey, {
                expiresIn: "24h",
                algorithm: conf.algorithm
              })

              response
                .status(200)
                .send({
                  success: true,
                  data: {
                    token: token
                  }
                })
            }
          })
        }
      })
      .catch(function(err) {
        throw err;
      })
  }
}
