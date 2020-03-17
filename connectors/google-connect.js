const { google } = require('googleapis');
const fs = require('fs');
const  request = require('request');

//require('dotenv').config();
var credentials = null;
var redirect_url = "";

// Load client secrets from a local file.
fs.readFile('/etc/credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    credentials = JSON.parse(content)
  });

const defaultScope = [
    'https://www.googleapis.com/auth/calendar.events.readonly',
    'profile',
    'email'
]

module.exports.getAccessToken = async function (code, cb)    {
    const auth = createConnection();
    const { tokens } = await auth.getToken(code);
    cb(null, tokens);
}


//var clientId = process.env.GOOGLE_CLIENT_ID;
//var clientSecret = process.env.GOOGLE_CLIENT_SECRET;
var redirect = '/oauth2callback';

function createConnection(req) {

    var clientSecret = credentials.web.client_secret;
    var clientId = credentials.web.client_id;
    
    if (req) {
        redirect_url = req.protocol+"://"+req.headers.host + redirect;
    }

    return new google.auth.OAuth2(
        clientId, clientSecret, redirect_url
    );
}

module.exports.getAuthUrl = function (req) {
    const auth = createConnection(req);
    return auth.generateAuthUrl({
        //access_type: 'offline',
        prompt: 'consent',
        scope: defaultScope
    });
}

module.exports.analyzeCalander = function(req, cb) {
    //get oauth2 client
    //const oauth2Client = new google.auth.OAuth2();
    const oauth2Client = createConnection(req)
    var tokens = req.session.tokens;
    oauth2Client.setCredentials(tokens);
    var calendar = google.calendar({version: 'v3', auth: oauth2Client});
    calendar.events.list({
        calendarId: 'primary',
        timeMin: (new Date(2019, 1, 1)).toISOString(),
        timeMax: (new Date(2019, 12, 31)).toISOString(),
        maxResults: 1000,
        singleEvents: true,
        orderBy: 'startTime',
      }, (err, res) => {
        if (err) return console.log('The API returned an error: ' + err);
        const events = res.data.items;
        var analysis = {flights: 0, one_on_one:0, total_events:0, group_meets:0}
        events.map((event, i) => {
            //     cb({start: event.start.dateTime || event.start.date, event: event.summary})
            const start = event.start.dateTime || event.start.date;
            analysis.total_events += 1;
            if (event.summary && event.summary.trim().toLowerCase().startsWith("flight")) {
                analysis.flights += 1;
            }

            var other_attendee = 0;
            if ('attendees' in event) {
                event.attendees.map((attendee, i) => {
                    if (attendee.self != true) {
                        other_attendee += 1;
                    }
                });
                if (other_attendee > 1) {
                    analysis.group_meets += 1;
                } else if (other_attendee == 1) {
                    analysis.one_on_one += 1;
                }
            }
        });
        cb(req, analysis);
    });
}

module.exports.revoke = function(req, cb) {
    request.post({
      headers: {'content-type' : 'application/x-www-form-urlencoded'},
      url:     'https://oauth2.googleapis.com/revoke',
      form:    {token: req.session.tokens.access_token}
    }, function(error, response, body){
        if (error) {
            console.log(error);
        }
        delete req.session.tokens;
        cb(req);
    });
}

