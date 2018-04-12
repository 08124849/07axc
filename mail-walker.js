
const Ndmail = require('ndmail')
    , utils = require('./utils')
    , fs = require('fs')
    , path = require('path')
    , mkdirp = require('mkdirp')
    
let config = utils.readConfig()
  , ndmail = new Ndmail({
    imap: config.imap,
    smtp: config.smtp
  })
  , db = utils.createDbConn(config.database.mail_srv)

function saveAttachments(msg, msgId) {
  for(let i=0;i<msg.attachments.length;i++) {
    let attachment = msg.attachments[i]
      , filedir = path.join('./attachments', msg.uid + '')
      , filepath = path.join(filedir, attachment.filename)
    
    mkdirp(filedir, function(err) {
      if (err) throw err;
      fs.writeFile(filepath, attachment.content, function(err) {
        if (err) {
          throw err
        } else {
          db.query("INSERT INTO attachments(filename, encoding, size, cid, contenttype, filepath, message_id) VALUES($1, $2, $3, $4, $5, $6, $7)", [
            attachment.filename, attachment.encoding, attachment.size, attachment.cid || 0, attachment.contentType, filepath, msgId
          ]).catch(console.log)
        }
      })
    })

  }
}

ndmail.on('imap_error', function(err) {
  console.log(err)
})
  
ndmail.on('error', function(err) {
  console.log(err)
})
  
ndmail.on('mail', function(msg) {
  db.query("INSERT INTO message(messageid, subject, html, textcontent, received, rcvfrom, rcvto, uid, seqno) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id", [
    msg.messageId, msg.subject, msg.html, msg.text, msg.date, msg.from[0].address, msg.to[0].address, msg.uid, msg.seqno
  ])
  .then(function(res) {
    saveAttachments(msg, res.rows[0].id)
  })
  .catch(function(err) {
    console.log('[ERROR]' + err)
  })
})
  
ndmail.connect(function() {
  db.query("SELECT uid FROM message ORDER BY uid DESC LIMIT 1")
    .then(function(res) {
      let uid = (res.rows.length) ? (parseInt(res.rows[0].uid) + 1) : 1
      ndmail.fetchMailFrom(uid)
    })
    .catch(function(err) {
      throw err;
    })
  
})
