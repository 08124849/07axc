function mails(req, res) {
  let data = []
    , searchParam = req.query.s
  if (!searchParam)  {
    res
      .status(400)
      .json({
        success: false,
        message: 'Something wrong'
      })
    return
  }
  req
    .db
    .query("SELECT * FROM message WHERE subject LIKE $1", [`%${searchParam}%`])
    .then(function(res) {
      data = res.rows
      let promises = []
      res.rows.forEach((v, i) => {
        promises.push(req.db.query("SELECT * FROM attachments WHERE message_id=$1", [v.id]).then(function(result) {
          data[i].content = v.html || v.textcontent
          delete data[i].html
          delete data[i].textcontent
          data[i].attchments = result.rows
        }))
      })
      return Promise.all(promises)
    })
    .then(function() {
      res
        .status(200)
        .json({
          success: true,
          data: data
        })
    })
    .catch(console.log)
}


module.exports = function(route) {
  route.get('/mails', mails)
}
