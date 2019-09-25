var express = require('express');
var router = express.Router();
var fs =require('fs');
var graph = require('@microsoft/microsoft-graph-client');
require('isomorphic-fetch');

/* GET home page. */
router.get('/', function(req, res, next) {
  fs.readFile(__dirname+'/../accessToken/accessToken.json', async (err, data)=>{
    if (err) throw err;
    var tokenData = JSON.parse(data);
    console.log("From inside", tokenData);
    var accessToken=tokenData.access_token;
    console.log(accessToken);
    var username=tokenData.userData.name;
    console.log(username);
    let parms = { title: 'Calendar', active: { inbox: true } };

    if (accessToken&&username) {
      parms.user=username;

      const client = graph.Client.init({
        authProvider:(done)=>{
          done(null, accessToken);
        }
      });

      console.log(client);

      try {
      // Get the 10 newest messages from inbox
      const result = await client
      .api(`/me/events`)
      .select('subject,start,end')
      .orderby('start/dateTime DESC')
      .get();

      parms.messages = result.value;
      console.log(result.value);
      fs.writeFile(__dirname+"/../calendarData/calendarData.json", JSON.stringify(result.value), function(err){
        if (err) {
          return console.log(err);
        }
        console.log("The file has been save");
      })
      res.render('calendar_success');
    } catch (err) {
      parms.message = 'Error retrieving messages';
      parms.error = { status: `${err.code}: ${err.message}` };
      parms.debug = JSON.stringify(err.body, null, 2);
      res.render('error', parms);
    }
    }
  });
});

module.exports = router;
