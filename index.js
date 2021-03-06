var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
const fetch = require('chainfetch');

var client_id = process.env.client_id; // Your client id
var client_secret = process.env.client_secret; // Your secret
var redirect_uri = 'http://streamlinkpixel.herokuapp.com/callback'; // Your redirect uri
var access_token;
var refresh_token;

const tmi = require('tmi.js');

const opts = {
  connection: {
    reconnect: true
  },
  identity: {
    username: 'soundlinktwitch',
    password: process.env.password
  },
  channels: [
    "PixelPAVL",
    "KyllianGamer"
  ]
};
const client = new tmi.client(opts);

client.on('message', onMessageHandler);
client.connect();

const SkipSong = async function() {
  await fetch.post('https://api.spotify.com/v1/me/player/next')
    .set([
      ['Accept', 'application/json'],
      ['Content-Type', 'application/json'],
      ['Authorization', `Bearer ${access_token}`]
    ]);
}

const GetSong = async function() {
  await fetch.get('https://api.spotify.com/v1/me/player/currently-playing')
    .set([
      ['Accept', 'application/json'],
      ['Content-Type', 'application/json'],
      ['Authorization', `Bearer ${access_token}`]
    ]).then(function(response) {
      /*response.status     //=> number 100–599
      response.statusText //=> String
      response.headers    //=> Headers
      response.url        //=> String */
      console.log(response.body.item.name);
      let artists = "";
      for (var i = 0; i < response.body.item.artists.length; i++) {
        if (i === response.body.item.artists.length-1) {
          artists = artists + response.body.item.artists[i]["name"];
        } else { artists = artists + response.body.item.artists[i]["name"] + ", " }
      }
      client.say("PixelPAVL", "Currently playing: " + response.body.item.name + " by: " + artists);
    }, function(error) {
      error.message //=> String
    })
}

async function onMessageHandler (target, context, msg, self) {
  if (self) { return; }
  const commandName = msg.trim();
  if (commandName === "!skip") {
    if (access_token) {
      if (!context.mod) return;
      SkipSong();
    }   
  } else if (commandName === "!song") {
    if (access_token) {
      GetSong();
    } 
  }
}

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser());

app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-modify-playback-state user-read-playback-state';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        access_token = body.access_token,
        refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          //console.log(body);
        });

        // we can also pass the token to the browser to make requests from there
        res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.get('/refresh_token', function(req, res) {
  // requesting access token from refresh token
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

app.get('/skip-request', async function(req, res) {

  console.log("skip");

  if (access_token) SkipSong();

});

app.get('/revive', async function(req, res) {

  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      access_token = body.access_token;
    }
  });
    return res.send('Revive');
});

console.log('Listening on 8888');
app.listen(process.env.PORT || 8888);
