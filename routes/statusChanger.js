var express = require('express');
var router = express.Router();
var fs =require('fs');
var authHelper = require('../helper/auth');
var graph = require('@microsoft/microsoft-graph-client');
const jwt = require('jsonwebtoken');
const { WebClient } = require('@slack/web-api');
require('dotenv').config();
require('isomorphic-fetch');
// console.log(authHelper);
console.log("ROUTE INI TELAH DIPANGGIL");

const credentials = {
  client: {
    id: process.env.APP_ID,
    secret: process.env.APP_PASSWORD,
  },
  auth: {
    tokenHost: 'https://login.microsoftonline.com',
    authorizePath: 'common/oauth2/v2.0/authorize',
    tokenPath: 'common/oauth2/v2.0/token'
  }
};
const oauth2 = require('simple-oauth2').create(credentials);
const { Client } = require('pg');
// console.log(Client);
// console.log(process.env.DATABASE_URL);

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
});
// console.log(client);

client.connect();

//Lalu disini juga yang melakukan pengecekan waktu sekarang dengan jadwal yang didapat dari outlook calendar
//Lalu disini juga harus ada yang mengubah status ke slack sesuai dengan jadwal yang didapatkan di outlook calendar.

/* GET home page. */
router.get('/', async function(req, res, next) {
  console.log("MASUK KE FUNCTION ROUTE HANDLER INI");
  var timestampNow=new Date();
  console.log(timestampNow);
  var rowsFromDB='';
  // console.log(client);
  client.query('SELECT * FROM public."Credentials";', (err, res) => {
    console.log("MASUK SELECT LOOP");
    rowsFromDB=res.rows;

    //Melakukan Looping untuk mengiterasi setiap data yang dikembalikan dari database
    //Ganti index ke 0 [0] dengan hsil iterasi dari hasil dari db
    for (var i = 0; i < res.rows.length; i++) {
      if(res.rows[i].microsoft_access_token){
        var expiration = parseInt(res.rows[i].login_timestamp)+res.rows[i].microsoft_access_token_expires;
        // console.log("Expiration", new Date(expiration));
        var now=new Date().getTime();
        // console.log("Now", new Date(now));
        if (expiration<now) {
          // console.log("Minta token baru pake refreshToken");
          var newAccessToken=useRefreshToken(res.rows[i].microsoft_refresh_token)
          // console.log(newAccessToken);
          var events=getEvent(newAccessToken, res.rows[i].slack_access_token);
          // console.log(events);
        }
        else {
          // console.log("Pakai token lama karena belum expired");
          var events=getEvent(res.rows[i].microsoft_access_token);
        }
      }
    }
  });

  res.render('calendar_success');
});



// Fungsi ini berguna untuk mengambil data event dari Outlook Calendar.
async function getEvent(accessToken, slack_access_token){
  // console.log("accessToken", accessToken);

  const graphClient = graph.Client.init({
    authProvider:(done)=>{
      done(null, accessToken);
    }
  });

  try {
    // Get event from calendar
    const result = await graphClient
    .api(`/me/events`)
    .select('subject,start,end')
    .orderby('start/dateTime DESC')
    .get();

    console.log(result.value);
    for (var i = 0; i < result.value.length; i++) {
      var start = result.value[i].start.dateTime;
      var startDate = new Date(start);
      // startDate.setHours(startDate.getHours() + 7);
      var end = result.value[i].end.dateTime;
      var endDate = new Date(end);
      // endDate.setHours(endDate.getHours() + 7);
      // console.log(start,"sandy goblog", startDate);
      // console.log(typeof end, new Date(end));
      // console.log("1 |start", new Date(start), "|now|", timestampNow, "|end|", new Date(end));
      // console.log("2", timestampNow >= new Date(start));
      // console.log("3", timestampNow <= end);
      // console.log("4 res2", result.value[i].end.dateTime);
      // console.log(endDate.getTime());
      if (timestampNow>=startDate&&timestampNow<=endDate) {
        console.log("Harusnya ganti status disini");
        console.log(timestampNow.getTime(), startDate.getTime(), endDate.getTime());
        //Memanggil fungsi untuk merubah status.
        changeStatusSlack(slack_access_token, endDate.getTime());
      }
      else {
        console.log("Tidak ada event yang bersamaan dengan waktu skrng");
      }
    }

  }catch (err) {
    console.log("error", err);
  }
}


// Fungsi ini berguna untuk meminta access token yang baru dengan menggunakan refresh token.
async function useRefreshToken(auth_code) {
  try{
    let newToken=await oauth2.accessToken.create({refresh_token: auth_code}).refresh();

    const user = jwt.decode(newToken.token.id_token);
    const databaseValue={};
    newToken.token.userData=user;
    databaseValue.microsoft_username=newToken.token.userData.preferred_username;
    databaseValue.microsoft_access_token_expires=newToken.token.expires_in;
    databaseValue.microsoft_access_token=newToken.token.access_token;
    databaseValue.microsoft_refresh_token=newToken.token.refresh_token;
    databaseValue.login_timestamp=new Date().getTime();

    var queryText='UPDATE public."Credentials" SET microsoft_refresh_token=$2, microsoft_access_token_expires=$3, microsoft_access_token=$4, login_timestamp=$5 WHERE microsoft_username=$1 RETURNING *';
    var valueForInsert=[databaseValue.microsoft_username, databaseValue.microsoft_refresh_token, databaseValue.microsoft_access_token_expires, databaseValue.microsoft_access_token, databaseValue.login_timestamp];

    client.query(queryText, valueForInsert, (err, res) => {
      if (err) {
        console.log(err.stack)
      } else {
        console.log("SUKSES", res.rows)
      }
    });
    return newToken.token.access_token;
  }
  catch(err){
    console.log(err);
  }
}


// Fungsi ini berguna untuk mengganti status di slack
async function changeStatusSlack(slack_access_token, endDate){
  console.log(endDate/1000);
  const web = new WebClient(slack_access_token);

  const result = await web.users.profile.set({
    "profile":{
        "status_text": "In A Meeting",
        "status_emoji": ":no_entry:",
        "status_expiration":endDate/1000
      }
  });
}

module.exports = router;
