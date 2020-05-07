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

const colors = {
  'green': 0x00FF00,
  'blue': 0x0000FF,
  'orange': 0xFF8000,
  'light_blue': 0x00FFFF,
  'yellow': 0xFFFF00,
  'pink': 0xFF00FF,
  'red': 0xFF0000
}

function preload() {
  this.load.image('char_base', 'assets/char_base.png')
  this.load.image('bg_00', 'assets/bg_00.png')
}

function create() {
  console.log(DM);
  var self = this;
  manager = this;
  this.add.image(0, 0, 'bg_00').setOrigin(0).setScale(0.8);
  this.socket = io();
  this.otherPlayers = this.physics.add.group();
  this.enemies = this.physics.add.group(); // For client storage.

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
  this.socket.on('playerColorUpdated',function(playerInfo){
    self.otherPlayers.getChildren().forEach(function(otherPlayer){
      if(playerInfo.playerId === otherPlayer.playerId){
        otherPlayer.getAt(0).setTint(colors[playerInfo.color]);
      }
    });
  });
  this.socket.on('enemyCreated',function(enemyInfo){
    if(!DM){
      var enemy_container = createEnemyHelper(enemyInfo.x, enemyInfo.y, enemyInfo.size, enemyInfo.id);
      manager.enemies.add(enemy_container);
      console.log('Creating new enemy from server.');
    }
  });
  this.socket.on('currentDMChars',function(enemiesInfo){
    if(enemiesInfo){
      Object.keys(enemiesInfo).forEach(function(id){
        var enemyInfo = enemiesInfo[id];
        var enemy_container = createEnemyHelper(enemyInfo.x, enemyInfo.y, enemyInfo.size, enemyInfo.id);
        manager.enemies.add(enemy_container);
      });
    }
  });
  this.socket.on('enemyUpdated',function(enemyInfo){
    if(!DM){
      self.enemies.getChildren().forEach(function(enemy){
        if(enemy.id === enemyInfo.id){
          console.log(enemy.id);
          enemy.setPosition(enemyInfo.x, enemyInfo.y);
          enemy.alpha = enemyInfo.alpha;
        }
      });
    }
  });
  this.socket.on('enemyDelete', function(enemyInfo){
    self.enemies.getChildren().forEach(function(enemy){
      if(enemy.id === enemyInfo && manager.deleteMode==true){
        manager.deleteMode=false;
        enemy.destroy();
        console.log("Deleted: " + enemy.id);
      }
    });
  });
  // End update callbacks.

  this.socket.on('disconnect', function (playerId) {
    self.otherPlayers.getChildren().forEach(function(otherPlayer) {
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
    else if(DM){
      for(var i=0;i<manager.enemies.getChildren().length;i++){
        var enemy = manager.enemies.getChildren()[i];
        if(distance(enemy.x,pointer.x,enemy.y,pointer.y)<40){
          if(manager.deleteMode){
            manager.deleteMode=false;
            enemy.destroy();
            manager.socket.emit('ememyDelete',{enemyId: enemy.id})
          }
          enemy.followMouse = true;
          break;
        }
      }
    }
  }, this);
  this.input.on('pointerup',function(pointer){
    if(this.tile){
      this.tile.followMouse = false;
    }
    manager.enemies.getChildren().forEach(function(enemy){
      enemy.followMouse = false;
    });
  }, this);
  this.input.on('pointermove',function(pointer){
    if(this.tile && this.tile.followMouse === true){
      this.tile.setPosition(pointer.x, pointer.y)
    }
    if(DM){
      manager.enemies.getChildren().forEach(function(enemy){
        if(enemy.followMouse){
          enemy.setPosition(pointer.x,pointer.y);
        }
      });
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
  if(DM){
    manager.enemies.getChildren().forEach(function(enemy){
      var x = enemy.x;
      var y = enemy.y;
      var a = enemy.alpha;
      // If moved then update server.
      if (enemy.oldPosition && (x !== enemy.oldPosition.x || y !== enemy.oldPosition.y || a !== enemy.oldPosition.alpha)) {
        manager.socket.emit('enemyUpdate', {x: x, y: y, alpha: a, id: enemy.id});
      }
      // Save old pos data.
      enemy.oldPosition = {
        x: x,
        y: y,
        alpha: a
      };
    });
  }
}

function addPlayer(self, playerInfo){
  var tile = self.physics.add.image(0,0, 'char_base').setOrigin(0.5,0.5).setDisplaySize(40, 40);
  tile.setTint(colors[playerInfo.color]);
  var text = createPlayerTextLabel(self, playerInfo.name);
  self.tile = self.add.container(playerInfo.x, playerInfo.y,[tile,text]);
}

function addOtherPlayers(self, playerInfo){
  const otherPlayer = self.add.sprite(0,0, 'char_base').setOrigin(0.5,0.5).setDisplaySize(40, 40);
  otherPlayer.setTint(colors[playerInfo.color]);
  var text = createPlayerTextLabel(self, playerInfo.name);
  const otherTile = self.add.container(playerInfo.x, playerInfo.y,[otherPlayer,text]);
  otherTile.playerId = playerInfo.playerId;
  self.otherPlayers.add(otherTile);
}

function createPlayerTextLabel(self, label){
  var text = self.add.text(0,-27,label);
  text.style.setFont("Arial");

  text.style.setFontSize('20px');
  text.style.setColor('black');
  text.setOrigin(0.5, 0.5);
  return text;
}

// Client Tools.
function updateName(form){
  var new_name = form[0].value
  manager.tile.getAt(1).text = new_name;
  manager.socket.emit('playerNameUpdate',{name: new_name});
}

function updateColor(form){
  var new_color = form[0].value
  manager.tile.getAt(0).setTint(colors[new_color]);
  manager.socket.emit('playerColorUpdate',{color: new_color});
}
// End Client Tools.

// DM TOOLS.
function hideEnemies(){
  //self.tile.alpha = 0; - TODO use for DM enemies
  console.log('TODO');
}
function showEnemies(){
  console.log('TODO');
}
function deleteEnemy(){
  if(!manager.deleteMode){
    manager.deleteMode=true;
  }
  else{
    manager.deleteMode=false;
  }
}
function createEnemy(x,y,size){
  var id = manager.enemies.getChildren().length;
  var enemy_container = createEnemyHelper(x,y,size,id);
  manager.enemies.add(enemy_container);
  manager.socket.emit('enemyCreate',{x: enemy_container.x, y: enemy_container.y, alpha: enemy_container.alpha, size: size, id: id});
}
function createEnemyHelper(x,y,size,id){
  var enemy = manager.physics.add.image(0,0, 'char_base').setOrigin(0.5,0.5).setDisplaySize(40, 40);
  enemy.setTint(colors['red']);
  var text = manager.add.text(0,0,id);
  text.style.setFont("Arial");
  text.style.setFontSize('20px');
  text.style.setColor('black');
  text.setOrigin(0.5, 0.5);
  var enemy_container = manager.add.container(x, y,[enemy,text]);
  enemy_container.id = id;
  return enemy_container;
}
// End DM Tools.

function distance(x1,x2,y1,y2){
  return Math.sqrt(Math.pow(x2-x1,2)+Math.pow(y2-y1,2));
}
