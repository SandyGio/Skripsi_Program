var express = require('express');
var router = express.Router();
var authHelper = require('../helper/auth');
var fs=require('fs');

/* GET /authorize. */
router.get('/', async function(req, res, next) {
  // Get auth code
  const code = req.query.code;

  token = await authHelper.getTokenFromCode(code);
  // let dataUser;
  // fs.readFile(__dirname+'/../accessToken/accessToken.json', (err, data)=>{
  //   if (err) throw err;
  //   let student = JSON.parse(data);
  //   dataUser=student
  // });
  // console.log(dataUser);
  // let student = JSON.parse(rawdata);
  let parms = { title: 'Slack Login', active: { home: true } };

  parms.signInUrlSlack = authHelper.getAuthUrlSlack();
  // console.log(parms.signInUrlSlack);
  res.render('authorize_success', parms);

});

module.exports = router;
