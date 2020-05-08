var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server)

const port = 25565;
var AUTH;

var players = {}
var dmEnemies = {}

/*
  Code was grabbed from the following URL and slightly modified to fit application.
  https://developers.google.com/sheets/api/quickstart/nodejs
  No license on code, free to edit and redistribute.
*/
const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Sheets API.
  authorize(JSON.parse(content), saveAuth);
});

/*
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
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
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

 function readRemiliaAC(auth){
   var promise = new Promise(async function(resolve, reject){
     const sheets = google.sheets({version: 'v4', auth});
     const response = (await sheets.spreadsheets.values.get({
       spreadsheetId: '1f_oKylI9noTnQhxGy-B6kCDf8fN0bBkasMsPShLhNiY',
       range: 'Remilia Merathor!E17',
     })).data;
     resolve(response);
   });
   promise.then(function(result){
     console.log(result);
   }, function(error){
     console.log('ERROR');
   });
 }
/*
  End of code grabbed from https://developers.google.com/sheets/api/quickstart/nodejs
*/

function saveAuth(auth){
  AUTH = auth;
}

// ----- BEGIN EXPRESS ROUTING ----- //
app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

app.get('/dm', function (req, res) {
  res.sendFile(__dirname + '/public/dm.html');
});
// ----- BEGIN EXPRESS ROUTING ----- //

io.on('connection', function (socket) {
  console.log('A user connected.');

  // Create a new player and add it to our players object.
  // TODO move to client side.
  players[socket.id] = {
    rotation: 0,
    x: Math.floor(Math.random() * 100) + 500,
    y: Math.floor(Math.random() * 100) + 500,
    playerId: socket.id,
    name: 'Unnamed Hollow',
    color: 'green'
  };
  // Send the players object to the new player.
  socket.emit('currentPlayers', players);
  socket.emit('currentDMEnemies', dmEnemies);
  // Update all other players of the new player.
  socket.broadcast.emit('newPlayer', players[socket.id]);
  // End new player creation.

  socket.on('disconnect', function () {
    console.log('User Disconnected.');
    delete players[socket.id];
    io.emit('disconnect', socket.id);
  });

  // When a player moves, update the player data.
  socket.on('playerMovement', function (movementData) {
    players[socket.id].x = movementData.x;
    players[socket.id].y = movementData.y;
    socket.broadcast.emit('playerMoved', players[socket.id]);
  });

  // Update name of player and notify clients.
  socket.on('playerNameUpdate', function(nameData){
    players[socket.id].name = nameData.name;
    socket.broadcast.emit('playerNameUpdated', players[socket.id]);
    console.log(`Player: ${socket.id} updated name to: ${nameData.name}.`);
  });
  // Update color of player and notify clients.
  socket.on('playerColorUpdate', function(data){
    players[socket.id].color = data.color;
    socket.broadcast.emit('playerColorUpdated', players[socket.id]);
    console.log(`Player: ${socket.id} updated color to: ${data.color}.`);
  });

  // DM updates
  socket.on('enemyCreate', function(enemyData){
    dmEnemies[enemyData.id]={
      x: enemyData.x,
      y: enemyData.y,
      alpha: enemyData.alpha,
      size: enemyData.size,
      id: enemyData.id
    };
    socket.broadcast.emit('enemyCreated', enemyData);
  });
  socket.on('enemyUpdate', function(enemyData){
    dmEnemies[enemyData.id].x = enemyData.x;
    dmEnemies[enemyData.id].y = enemyData.y;
    socket.broadcast.emit('enemyUpdated', dmEnemies[enemyData.id]);
  });
  socket.on('enemyDelete', function(enemyData){
    toDelete = dmEnemies[enemyData.enemyId];
    delete dmEnemies[enemyData.enemyId];
    socket.broadcast.emit('enemyDeleted', {id: enemyData.enemyId});
    console.log(`Enemy ${enemyData.enemyId} deleted.`);
  });
  socket.on('setEnemyVisibility', function(data){
    socket.broadcast.emit('setEnemyVisibility', data);
  });
  // End DM Updates

  // Basic relay socket to handle client to client messaging
  socket.on('relayMessage', function(relayData){
    socket.broadcast.emit(relayData.message, relayData.data);
  });
});


server.listen(port, function () {
  console.log(`Listening on ${server.address().port}`);
});
