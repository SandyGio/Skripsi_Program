var express = require('express');
var router = express.Router();
var fs =require('fs');
var graph = require('@microsoft/microsoft-graph-client');
require('isomorphic-fetch');

//Disini harus ada yang meminta access token milik microsoft menggunakan refresh token
//Disini juga harus ada yang mengambil data ke outlook calendar
//Lalu disini juga yang melakukan pengecekan waktu sekarang dengan jadwal yang didapat dari outlook calendar
//Lalu disini juga harus ada yang mengubah status ke slack sesuai dengan jadwal yang didapatkan di outlook calendar.
//Melakukan riset apakah token di slack bersifat permanen tiap user atau tidak
//Jika token di slack tidak permanen, maka lakukan meminta ulang token jika sudah expired.

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
      // Get event from calendar
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
