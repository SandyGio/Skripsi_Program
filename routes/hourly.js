var express = require('express');
var router = express.Router();
var fs =require('fs');
var authHelper = require('../helper/auth');
var graph = require('@microsoft/microsoft-graph-client');
const jwt = require('jsonwebtoken');
const { WebClient } = require('@slack/web-api');
require('dotenv').config();
require('isomorphic-fetch');

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

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
});

client.connect();

//Lalu disini juga yang melakukan pengecekan waktu sekarang dengan jadwal yang didapat dari outlook calendar
//Lalu disini juga harus ada yang mengubah status ke slack sesuai dengan jadwal yang didapatkan di outlook calendar.

/* GET home page. */
router.get('/', async function(req, res, next) {
  var rowsFromDB='';
  client.query('SELECT * FROM public."Credentials";', (err, res) => {
    rowsFromDB=res.rows;

    //Melakukan Looping untuk mengiterasi setiap data yang dikembalikan dari database
    //Ganti index ke 0 [0] dengan hsil iterasi dari hasil dari db
    if(res.rows[0].microsoft_access_token){
      var expiration = parseInt(res.rows[0].login_timestamp)+res.rows[0].microsoft_access_token_expires;
      console.log("Expiration", new Date(expiration));
      var now=new Date().getTime();
      console.log("Now", new Date(now));
      if (expiration<now) {
        console.log("Minta token baru pake refreshToken");
        var newAccessToken=useRefreshToken(res.rows[0].microsoft_refresh_token)
        console.log(newAccessToken);
        var events=getEvent(newAccessToken, res.rows[0].slack_access_token);
        console.log(events);
      }
      else {
        console.log("Pakai token lama karena belum expired");
        var events=getEvent(res.rows[0].microsoft_access_token);
      }
    }
  });

  res.render('calendar_success');
});



// Fungsi ini berguna untuk mengambil data event dari Outlook Calendar.
async function getEvent(accessToken, slack_access_token){
  console.log("accessToken", accessToken);

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

    //Memanggil function ganti status.
    //Harus melakukan filter waktu dulu disini.
    changeStatusSlack(slack_access_token);

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
async function changeStatusSlack(slack_access_token){
  const web = new WebClient(slack_access_token);

  const result = await web.users.profile.set({
    "profile":{
        "status_text": "In A Meeting",
        "status_emoji": ":no_entry:"
        // "status_expiration": 1532627506
      }
  });
}

module.exports = router;
