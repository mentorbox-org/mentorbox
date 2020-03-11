//npm modules
const express = require('express');
const uuid = require('uuid/v4')
const session = require('express-session')
var path = require('path');
const FileStore = require('session-file-store')(session);
const bodyParser = require('body-parser');

// create the server
const app = express();

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(express.static('static'))

// add & configure middleware
app.use(session({
  genid: (req) => {
    console.log('Inside the session middleware')
    console.log(req.sessionID)
    return uuid() // use UUIDs for session IDs
  },
  store: new FileStore(),
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
}))

// create the homepage route at '/'

app.get('/', (req, res) => {
    req.session.cred = "SomeCred";
  res.sendFile(path.join(__dirname + '/static/home.html'));
})

app.get('/gauth', (req, res) => {
    console.log(req.session)
    res.sendFile(path.join(__dirname + '/static/home.html'));
})


// tell the server what port to listen on
app.listen(8000, () => {
  console.log('Listening on localhost:3000')
})
