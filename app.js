//npm modules
const express = require('express');
const process = require('process');
const uuid = require('uuid/v4')
const session = require('express-session')
var path = require('path');
const FileStore = require('session-file-store')(session);
const bodyParser = require('body-parser');
const googlecon = require('./connectors/google-connect');
const exhbs = require('express-handlebars')
var url  = require('url');
const fs = require('fs');

var PORT = 8000;
if (process.env.NODE_MODE == "prod") {
  PORT = 80
}
// create the server
const app = express();
app.use(express.static('static'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.engine('handlebars', exhbs( {
  extname: 'handlebars',
  defaultView: 'default',
  defaultLayout: 'default',
}));

app.set('view engine', 'handlebars');

// add & configure middleware
app.use(session({
  genid: (req) => {
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

app.get('/revoke', (req, res) => {
  if (req.session.tokens) {
      googlecon.revoke(req, (req, err) => {
        if (err) {
          console.log(err)
        }
        res.sendFile(path.join(__dirname + '/static/home.html'));
    });
  } else {
    res.sendFile(path.join(__dirname + '/static/home.html'));
  }
})


app.get('/gauth', (req, res) => {
    if (req.session.tokens) {
        googlecon.analyzeCalander(req, (req, items) => {
        res.render('calstats', items)
      });
    } else {
      res.redirect(googlecon.getAuthUrl(req));
    }
})

const setToken = async (req, res, next) => {
  googlecon.getAccessToken(req.query.code, (err, tokens) => {
      if (err) {
          res.redirect('/gauth');
      } else {
          req.session.tokens = tokens;
      }
      next();
  });
}


app.get('/oauth2callback', setToken, (req, res) => {
  googlecon.analyzeCalander(req, (req, items) => {
    res.render('calstats', items)
  });
})

// tell the server what port to listen on
app.listen(PORT, () => {
  console.log('Listening on localhost: '+ PORT)
})
