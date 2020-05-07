var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server)
var players = {}
var dmChars = {}

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

app.get('/dm', function (req, res) {
  res.sendFile(__dirname + '/public/dm.html');
});

io.on('connection', function (socket) {
  console.log('A user connected.');

  // create a new player and add it to our players object
  players[socket.id] = {
    rotation: 0,
    x: Math.floor(Math.random() * 700) + 50,
    y: Math.floor(Math.random() * 500) + 50,
    playerId: socket.id,
    name: 'Unnamed Hollow',
    color: 'green'
    //team: (Math.floor(Math.random() * 2) == 0) ? 'red' : 'blue'
  };
  // send the players object to the new player
  socket.emit('currentPlayers', players);
  socket.emit('currentDMChars', dmChars);
  // update all other players of the new player
  socket.broadcast.emit('newPlayer', players[socket.id]);

  socket.on('disconnect', function () {
    console.log('User Disconnected.');
    // remove this player from our players object
    delete players[socket.id];
    // emit a message to all players to remove this player
    io.emit('disconnect', socket.id);
  });

  // when a player moves, update the player data.
  socket.on('playerMovement', function (movementData) {
    players[socket.id].x = movementData.x;
    players[socket.id].y = movementData.y;
    players[socket.id].rotation = movementData.rotation;
    // emit a message to all players about the player that moved
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
    dmChars[enemyData.id]={
      x: enemyData.x,
      y: enemyData.y,
      alpha: enemyData.alpha,
      size: enemyData.size,
      id: enemyData.id
    };
    socket.broadcast.emit('enemyCreated', enemyData);
  });
  socket.on('enemyUpdate', function(enemyData){
    dmChars[enemyData.id].x = enemyData.x;
    dmChars[enemyData.id].y = enemyData.y;
    dmChars[enemyData.id].alpha = enemyData.alpha;
    socket.broadcast.emit('enemyUpdated', dmChars[enemyData.id]);
  });
});

server.listen(8081, function () {
  console.log(`Listening on ${server.address().port}`);
});
