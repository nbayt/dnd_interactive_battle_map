var config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 1548,
  height: 1546,
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: { y: 0 }
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};
var game = new Phaser.Game(config);
var manager; // To add global ref. !VERY SAFE! :ok_handSign:

function preload() {
  this.load.image('char_base', 'assets/char_base.png')
  this.load.image('bg_00', 'assets/bg_00.png')
}

function create() {
  var self = this;
  manager = this;
  this.add.image(0, 0, 'bg_00').setOrigin(0).setScale(0.8);
  this.socket = io();
  this.otherPlayers = this.physics.add.group();

  this.socket.on('currentPlayers', function(players){
    Object.keys(players).forEach(function(id){
      if(players[id].playerId === self.socket.id){
        addPlayer(self, players[id]);
      }
      else{
        addOtherPlayers(self,players[id])
      }
    })
  });
  this.socket.on('newPlayer', function (playerInfo) {
    addOtherPlayers(self, playerInfo);
  });

  // Update callbacks.
  this.socket.on('playerMoved',function(playerInfo){
    self.otherPlayers.getChildren().forEach(function(otherPlayer){
      if(playerInfo.playerId === otherPlayer.playerId){
        otherPlayer.setRotation(playerInfo.rotation)
        otherPlayer.setPosition(playerInfo.x, playerInfo.y);
      }
    });
  });
  this.socket.on('playerNameUpdated',function(playerInfo){
    self.otherPlayers.getChildren().forEach(function(otherPlayer){
      if(playerInfo.playerId === otherPlayer.playerId){
        otherPlayer.getAt(1).text = playerInfo.name;
      }
    });
  });
  // End update callbacks.

  this.socket.on('disconnect', function (playerId) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerId === otherPlayer.playerId) {
        otherPlayer.destroy();
      }
    });
  });

  // Client input callbacks.
  this.cursors = this.input.keyboard.createCursorKeys();
  this.input.on('pointerdown', function(pointer){
    if(this.tile && distance(this.tile.x,pointer.x,this.tile.y,pointer.y)<40){
      this.tile.followMouse = true;
    }
  }, this);
  this.input.on('pointerup',function(pointer){
    if(this.tile){
      this.tile.followMouse = false;
    }
  }, this);
  this.input.on('pointermove',function(pointer){
    if(this.tile && this.tile.followMouse === true){
      this.tile.setPosition(pointer.x, pointer.y)
    }
  }, this);
}

function update() {
  if (this.tile) {
    var x = this.tile.x;
    var y = this.tile.y;
    var r = this.tile.rotation;
    // If moved then update server.
    if (this.tile.oldPosition && (x !== this.tile.oldPosition.x || y !== this.tile.oldPosition.y || r !== this.tile.oldPosition.rotation)) {
      this.socket.emit('playerMovement', { x: this.tile.x, y: this.tile.y, rotation: this.tile.rotation });
    }

    // Save old pos data.
    this.tile.oldPosition = {
      x: this.tile.x,
      y: this.tile.y,
      rotation: this.tile.rotation
    };
  }
}

function addPlayer(self, playerInfo){
  var tile = self.physics.add.image(0,0, 'char_base').setOrigin(0.5,0.5).setDisplaySize(40, 40);
  if(playerInfo.team === 'blue'){
    tile.setTint(0x0000FF);
  }
  else{
    tile.setTint(0xFF0000);
  }
  var text = self.add.text(0,-27,playerInfo.name);
  text.style.setFont("Arial");

  text.style.setFontSize('20px');
  text.style.setColor('black');
  text.setOrigin(0.5, 0.5);
  self.tile = self.add.container(playerInfo.x, playerInfo.y,[tile,text]);
}

function addOtherPlayers(self, playerInfo){
  const otherPlayer = self.add.sprite(0,0, 'char_base').setOrigin(0.5,0.5).setDisplaySize(40, 40);
  if(playerInfo.team === 'blue'){
    otherPlayer.setTint(0x0000FF);
  }
  else{
    otherPlayer.setTint(0xFF0000);
  }
  var text = self.add.text(0,-27,playerInfo.name);
  text.style.setFont("Arial");
  text.style.setFontSize('20px');
  text.style.setColor('black');
  text.setOrigin(0.5, 0.5);
  const otherTile = self.add.container(playerInfo.x, playerInfo.y,[otherPlayer,text]);
  otherTile.playerId = playerInfo.playerId;
  self.otherPlayers.add(otherTile);
}

function updateName(form){
  var new_name = form[0].value
  manager.tile.getAt(1).text = new_name;
  manager.socket.emit('playerNameUpdate',{name: new_name});
}

function updateColor(form){
  console.log("Nothing!");
}

function distance(x1,x2,y1,y2){
  return Math.sqrt(Math.pow(x2-x1,2)+Math.pow(y2-y1,2));
}
