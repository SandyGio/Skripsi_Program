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
const jwt = require('jsonwebtoken');
var fs = require('fs');

function getAuthUrl() {
  const returnVal = oauth2.authorizationCode.authorizeURL({
    redirect_uri: process.env.REDIRECT_URI,
    scope: process.env.APP_SCOPES
  });
  return returnVal;
}

async function getTokenFromCode(auth_code) {
  let result = await oauth2.authorizationCode.getToken({
    code: auth_code,
    redirect_uri: process.env.REDIRECT_URI,
    scope: process.env.APP_SCOPES
  });

  const token = oauth2.accessToken.create(result);
  const user = jwt.decode(token.token.id_token);
  token.token.userData=user;

  //This part will be replace with insert data to database. 
  fs.writeFile(__dirname+"/../accessToken/accessToken.json", JSON.stringify(token.token), function(err){
    if (err) {
      return console.log(err);
    }
    console.log("The file has been save");
  })

  return token.token.access_token;
}

exports.getTokenFromCode = getTokenFromCode;

exports.getAuthUrl = getAuthUrl;
