var express 	   	= require('express'),
		bodyParser  	= require('body-parser'),
		cors			    =	require('cors'),
    fs            = require('fs'),
    path          = require('path'),
    readline      = require('readline'),
    helmet        = require('helmet'),
    Mailchimp     = require('mailchimp-api-v3'),
    md5           = require('md5');


var app = express();


//  Charles
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"


const PORT = 4887;

app.use(cors());
app.use(bodyParser.urlencoded({extended: true}));

app.use(helmet());

//  Serve contents of 'interactive' directory
app.use(express.static('interactive'));


//  ***********************************************
//  Express routes
//  ***********************************************
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname+'/interactive/voting.html'));
});

app.post('/vote', (req, res) => {
  //  Send vote to Google Docs
  console.log("Vote received - submitting to Google Docs.");
  let voteData = req.body;
  voteData.name = voteData.name.replace(/<\/?[^>]+(>|$)/g, "");     //  Strips HTML tags, ie <em>
  voteData.emailProvided = voteData.emailAddress === undefined ? 'No' : 'Yes';
  voteData.date = getDate();
  voteData.time = getTime();
  saveVoteLocally(voteData);
  saveVoteToGDocs(voteData);
  if(voteData.emailAddress) {
    sendEmailToMailchimp(voteData);
  }
  res.json({'message': 'Done!'});
});


const localLogFile = './vote_log.txt';

function saveVoteLocally(voteData) {
  console.log("Saving vote locally...");
  let voteString = `${voteData.id},${voteData.name},${voteData.emailProvided},${voteData.date},${voteData.time}\r\n`;
  console.log(voteString);
  fs.appendFile(localLogFile, voteString, function (err) {
    if (err) {
      console.log("Error saving to local file: ", err); 
    } else {
      console.log('Vote successfully saved to local file (', localLogFile, ')');
    }
  });
}



//  ***********************************************
//  Google Sheets integration
//  ***********************************************
const {google} = require('googleapis');
var SCOPES = "https://www.googleapis.com/auth/spreadsheets";
const TOKEN_PATH = 'credentials/google_token.json';

function saveVoteToGDocs(voteData) {
  console.log("Saving vote to Google Docs...");
  fs.readFile('credentials/google_credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Sheets API.
    authorize(JSON.parse(content), voteData, sendVoteToGDocs);
  });
}

function authorize(credentials, voteData, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client, voteData);
  });
}

function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

function sendVoteToGDocs(auth, voteData) {
  const sheets = google.sheets({version: 'v4', auth});
  // console.log(voteData);
  sheets.spreadsheets.values.append({
    spreadsheetId: '1O_868H6n8TPEMrvbijKysbwBvqosNqvxmnutYqp2K0c',
    range: 'Sheet1!A1:E',
    insertDataOption: 'INSERT_ROWS',
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: [[voteData.id, voteData.name, voteData.emailProvided, voteData.date, voteData.time]]
    }
  }, (err, res) => {
    if(err) {
      console.log("Error!");
      console.log(err);
    } else {
      console.log("Vote successfully saved to Google Docs.");
    }
  });
};



//  ***********************************************
//  Mailchimp integration
//  ***********************************************

function sendEmailToMailchimp(voteData) {
  console.log("Sending email to Mailchimp...");
  loadMcConfig(voteData, makeMcRequest);
  // loadMcCredentials(voteData, makeMcRequest);
}

function loadMcConfig(voteData, callback) {
  console.log("Loading Mailchimp configuration...");

  fs.readFile('credentials/mc_config_REM.json', (err, config) => {
    if (err) {
      return console.log('Error loading mailchimp configuration file:', err);
    } else {
      console.log('Mailchimp configuration loaded.');
      // console.log("Content: ");
      config = JSON.parse(config);
      // console.log(config);
      callback(voteData, config);
    }
  });
}

function makeMcRequest(voteData, config) {
  console.log("Making Mailchimp request...");
  let hash = md5(voteData.emailAddress.toLowerCase());

  var mailchimp = new Mailchimp(config.API_key);

  mailchimp.put({
    path: '/lists/' + config.list_id + '/members/' + hash,
    body: {
      "email_address": voteData.emailAddress,
      "status": "pending",        //  Confirm - subscribed or pending
      "interests": {
        [config.group_id]: true
      }
    }
  }, (err, result) => {
    if(err) {
      console.log("Error!\n" + err);
    } else {
      console.log("Email successfully subscribed to MailChimp!");
      console.log(result);
    }
  });
}



//  ***********************************************
//  Utility functions
//  ***********************************************
function getDate() {
  let today = new Date();
  let year = today.getFullYear();
  let month = ("0" + (today.getMonth()+1)).slice(-2);
  let day = ("0" + today.getDate()).slice(-2);
  let date = year + '-' + month + '-' + day;
  return date;
}
function getTime() {
  let today = new Date();
  let hours = ("0" + today.getHours()).slice(-2);
  let mins = ("0" + today.getMinutes()).slice(-2);
  let secs = ("0" + today.getSeconds()).slice(-2);
  let time = hours + ":" + mins + ":" + secs;
  return time;
}

//  ***********************************************
//  Start server and listen for requests
//  ***********************************************
app.listen(PORT, 'localhost', function() {
  console.log("Server started");
});

