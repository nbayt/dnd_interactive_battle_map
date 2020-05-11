var config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 1800,
  height: 2500,
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
var nextEnemyID = 0;
var keyStatesDM = {};


// TODO auto populate html with this list.
const colors = {
  'green': 0x00FF00,
  'blue': 0x0000FF,
  'orange': 0xFF8000,
  'light_blue': 0x00FFFF,
  'yellow': 0xFFFF00,
  'pink': 0xFF00FF,
  'teal': 0x008080,
  'forest_green': 0x228B22,
  'peru': 0xCD853F,
  'pale_green': 0x98FB98,
  'red': 0xFF0000
}

function preload() {
  this.load.image('char_base', 'assets/pawn.png')
  this.load.image('bg', 'assets/bg_02.png');

  this.load.image('enemy_small', 'assets/enemy_small.png');
  this.load.image('enemy_medium', 'assets/enemy_medium.png');
  this.load.image('enemy_large', 'assets/enemy_large.png');
  this.load.image('enemy_huge', 'assets/enemy_huge.png');

  this.load.image('george_snake', 'assets/G-Man.png');

  this.load.image('state_knocked_down', 'assets/state_knocked_down.png');
  this.load.image('state_incap', 'assets/state_incap.png');

  this.load.image('green_box', 'assets/green_box.png');

  // Setup map list TODO
  if(DM){
    var str = '';
    for(var i=0;i<5;i++){
      str+=`<option value="0${i}">0${i}</option>`;
    }
    document.getElementById("set_map").innerHTML = str;
  }
}

function create() {
  console.log(`Is DM = ${DM}`);
  var self = this;
  manager = this;
  this.add.image(0, -100, 'bg').setOrigin(0).setScale(0.45);
  this.socket = io();

  // For client storage.
  this.otherPlayers = this.physics.add.group();
  this.enemies = this.physics.add.group();

  // Init all current players.
  this.socket.on('currentPlayers', function(players){
    Object.keys(players).forEach(function(id){
      if(players[id].playerId === self.socket.id){
        addPlayer(self, players[id]);
      }
      else{
        console.log('Current Players');
        console.log(players[id]);
        var otherPlayer = addOtherPlayers(self,players[id]);
        self.otherPlayers.add(otherPlayer);
        changePlayerStates(otherPlayer, players[id].states);
      }
    })
  });
  this.socket.on('newPlayer', function (playerInfo) {
    var otherPlayer = addOtherPlayers(self,playerInfo);
    self.otherPlayers.add(otherPlayer);
  });

  // Update callbacks.
  this.socket.on('playerMoved',function(playerInfo){
    self.otherPlayers.getChildren().forEach(function(otherPlayer){
      if(playerInfo.playerId === otherPlayer.playerId){
        otherPlayer.setPosition(playerInfo.x, playerInfo.y);
      }
    });
  });
  // We can roll these two into a singular socket.
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
  this.socket.on('playerStateChanged', function(data){
    if(self.tile.playerId === data.playerId){
      changePlayerStates(self.tile, data.states);
    }
    else{
      self.otherPlayers.getChildren().forEach(function(player){
        if(player.playerId === data.playerId){
          changePlayerStates(player, data.states);
        }
      });
    }
  });
  this.socket.on('enemyCreated',function(enemyInfo){
    if(!DM){
      var enemy_container = createEnemyHelper(enemyInfo.x, enemyInfo.y, enemyInfo.size, enemyInfo.id);
      manager.enemies.add(enemy_container);
    }
  });
  this.socket.on('currentDMEnemies',function(enemiesInfo){
    if(enemiesInfo){
      Object.keys(enemiesInfo).forEach(function(id){
        var enemyInfo = enemiesInfo[id];
        var enemy_container = createEnemyHelper(enemyInfo.x, enemyInfo.y, enemyInfo.size, enemyInfo.id);
        manager.enemies.add(enemy_container);
        changeEnemyStates(enemy_container, enemyInfo.states);
      });
    }
  });
  this.socket.on('enemyUpdated',function(enemyInfo){
    if(!DM){
      self.enemies.getChildren().forEach(function(enemy){
        if(enemy.id === enemyInfo.id){
          enemy.setPosition(enemyInfo.x, enemyInfo.y);
        }
      });
    }
  });
  this.socket.on('enemyDeleted', function(enemyData){
    self.enemies.getChildren().forEach(function(enemy){
      if(enemy.id === enemyData.id){
        enemy.destroy();
      }
    });
  });
  this.socket.on('setEnemyVisibility', function(data){
    if(!DM) {
      self.enemies.getChildren().forEach(function(enemy){
        enemy.alpha=data.alpha;
      });
    }
  });
  this.socket.on('enemyStateChanged', function(data){
    self.enemies.getChildren().forEach(function(enemy){
      if(enemy.id === data.enemyId){
        changeEnemyStates(enemy, data.states);
      }
    });
  });

  // Handle dice rolls
  this.socket.on('diceRoll', function(data){
    updateDiceOutcomes(data.roll, data.name);
  });
  // End update callbacks.

  this.socket.on('getCharAC', function(data){
    console.log('Got chars AC');
    console.log(data);
    var innerhtml = ''
    Object.keys(data).forEach(function(char){
      innerhtml+=`<li>${char}: ${data[char]}</li>`
    });
    document.getElementById("char_ac_list").innerHTML = innerhtml;
  });

  this.socket.on('disconnect', function (playerId) {
    self.otherPlayers.getChildren().forEach(function(otherPlayer) {
      if (playerId === otherPlayer.playerId) {
        otherPlayer.destroy();
      }
    });
  });

  // DM Input Commands
  // ----- WIP ----- //
  if(DM && false){
    this.input.keyboard.on('keydown-B', function(){
      keyStatesDM.b = true;
      if(keyStatesDM.mDown){
        if(!keyStatesDM.box){
          keyStatesDM.box = this.physics.add.image(0,0, 'green_box').setOrigin(0.5,0.5).setDisplaySize(40, 40);
          //keyStatesDM.box.setDisplaySize()
        }
      }

    }, this);
    this.input.keyboard.on('keyup-B', function(){
      keyStatesDM.b = false;
    }, this);
  }
  // ----- END WIP ----- //

  // Client input callbacks.
  //this.input.keyboard.on('keydown-A', function(){}, this);
  //this.spaceBar = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  this.input.on('pointerdown', function(pointer){
    if(this.tile && distance(this.tile.x,pointer.x,this.tile.y,pointer.y)<40){
      this.tile.followMouse = true;
    }
    else if(DM){
      keyStatesDM.mDown = true;
      keyStatesDM.mX = pointer.x;
      keyStatesDM.mY = pointer.y;
      // Code to handle DM modification of enemy state and other variables.
      for(var i=0;i<manager.enemies.getChildren().length;i++){
        var enemy = manager.enemies.getChildren()[i];
        if(distance(enemy.x,pointer.x,enemy.y,pointer.y)<enemy.sizeVal){
          if(manager.deleteMode){
            manager.deleteMode=false;
            var id = enemy.id;
            enemy.destroy();
            manager.socket.emit('enemyDelete',{enemyId: id});
          }
          else if(manager.knockDownMode){ // Check if knockdown toggle is active.
            manager.knockDownMode = false;
            changeEnemyStates(enemy, {knockedDown: true, incaped: enemy.states.incaped});
            manager.socket.emit('enemyChangeState', {enemyId: enemy.id, states: enemy.states});
          }
          else if(manager.incapMode){ // Check if knockdown toggle is active.
            manager.incapMode = false;
            changeEnemyStates(enemy, {knockedDown: enemy.states.knockedDown, incaped: true});
            manager.socket.emit('enemyChangeState', {enemyId: enemy.id, states: enemy.states});
          }
          else if(manager.clearStatesMode){ // Check if clear states toggle is active.
            manager.clearStatesMode = false;
            changeEnemyStates(enemy, {knockedDown: false, incaped:false});
            manager.socket.emit('enemyChangeState', {enemyId: enemy.id, states: enemy.states});
          }
          enemy.followMouse = true;
          break;
        }
      }
      // Code to handle DM modification of player state and other variables.
      for(var i=0; i<manager.otherPlayers.getChildren().length;i++){
        var player = manager.otherPlayers.getChildren()[i];
        if(distance(player.x,pointer.x,player.y,pointer.y)<40){
          if(manager.knockDownMode){ // Check if knockdown toggle is active.
            manager.knockDownMode = false;
            changePlayerStates(player,{knockedDown: true, incaped: player.states.incaped});
            manager.socket.emit('playerChangeState', {playerId: player.playerId, states: player.states});
          }
          if(manager.incapMode){ // Check if incap toggle is active.
            manager.incapMode = false;
            changePlayerStates(player,{knockedDown: player.states.incaped, incaped: true});
            manager.socket.emit('playerChangeState', {playerId: player.playerId, states: player.states});
          }
          else if(manager.clearStatesMode){ // Check if clear states toggle is active.
            manager.clearStatesMode = false;
            changePlayerStates(player,{knockedDown: false, incaped: false});
            manager.socket.emit('playerChangeState', {playerId: player.playerId, states: player.states});
          }
          // break; <--- これは必要ですか？
        }
      }
    }
  }, this);
  this.input.on('pointerup',function(pointer){
    if(DM){
      keyStatesDM.mDown = false;
    }
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
    // If moved then update server.
    if (this.tile.oldPosition && (x !== this.tile.oldPosition.x || y !== this.tile.oldPosition.y)) {
      this.socket.emit('playerMovement', {x: this.tile.x, y: this.tile.y});
    }
    // Save old pos data.
    this.tile.oldPosition = {
      x: this.tile.x,
      y: this.tile.y
    };
  }
  if(DM){
    manager.enemies.getChildren().forEach(function(enemy){
      var x = enemy.x;
      var y = enemy.y;
      // If moved then update server.
      if (enemy.oldPosition && (x !== enemy.oldPosition.x || y !== enemy.oldPosition.y)) {
        manager.socket.emit('enemyUpdate', {x: x, y: y, id: enemy.id});
      }
      // Save old pos data.
      enemy.oldPosition = {x: x, y: y};
    });
  }
}

function addPlayer(self, playerInfo){
  var tile = self.physics.add.image(0,0, 'char_base').setOrigin(0.5,0.5).setDisplaySize(40, 40);
  tile.setTint(colors[playerInfo.color]);
  var states = createStates(40);
  var text = createPlayerTextLabel(self, playerInfo.name);
  var container = self.add.container(playerInfo.x, playerInfo.y,[tile,text,states]);
  container.states = {knockedDown: false, incaped: false};
  container.playerId = playerInfo.playerId;
  self.tile = container;
}

function addOtherPlayers(self, playerInfo){
  const otherPlayer = self.add.sprite(0,0, 'char_base').setOrigin(0.5,0.5).setDisplaySize(40, 40);
  otherPlayer.setTint(colors[playerInfo.color]);
  var states = createStates(40);
  var text = createPlayerTextLabel(self, playerInfo.name);
  const otherTile = self.add.container(playerInfo.x, playerInfo.y,[otherPlayer,text,states]);
  otherTile.playerId = playerInfo.playerId;
  otherTile.states = {knockedDown: false, incaped: false};
  return otherTile;
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
// Hide all enemies from players.
function hideEnemies(){
  manager.socket.emit('setEnemyVisibility',{alpha:0.0});
}
// Show all enemies.
function showEnemies(){
  manager.socket.emit('setEnemyVisibility',{alpha:1.0});
}
// Knock down enemy
function knockDown(){
  if(!manager.knockDownMode){
    manager.knockDownMode = true;
  }
  else{
    manager.knockDownMode = false;
  }
}
function incap(){
  if(!manager.incapMode){
    manager.incapMode = true;
  }
  else{
    manager.incapMode = false;
  }
}
// Clear States.
function clearStates(){
  if(!manager.clearStatesMode){
    manager.clearStatesMode = true;
  }
}
// UNUSED
function knockDownEnemy(enemy){
  enemy.states.knockedDown = true
  enemy.getAt(2).getAt(0).alpha=1;
}
// Change states of enemy.
function changeEnemyStates(enemy, states){
  enemy.states = states
  if(states.knockedDown){
    enemy.getAt(2).getAt(0).alpha=1;
  }
  else{
    enemy.getAt(2).getAt(0).alpha=0;
  }
  if(states.incaped){
    enemy.getAt(2).getAt(1).alpha=1;
  }
  else{
    enemy.getAt(2).getAt(1).alpha=0;
  }
}
// Change states of player.
function changePlayerStates(player, states){
  player.states = states
  if(states.knockedDown){
    player.getAt(2).getAt(0).alpha=1;
  }
  else{
    player.getAt(2).getAt(0).alpha=0;
  }
  if(states.incaped){
    player.getAt(2).getAt(1).alpha=1;
  }
  else{
    player.getAt(2).getAt(1).alpha=0;
  }
}
// Toggle delete mode.
function deleteEnemy(){
  if(!manager.deleteMode){
    manager.deleteMode = true;
  }
  else{
    manager.deleteMode=false;
  }
}
// Create an enemy at the given x,y position.
function createEnemy(x,y,size){
  var id = nextEnemyID;
  nextEnemyID++;
  var enemy_container = createEnemyHelper(x,y,size,id);
  manager.enemies.add(enemy_container);
  manager.socket.emit('enemyCreate',
  { x: enemy_container.x,
    y: enemy_container.y,
    alpha: enemy_container.alpha,
    size: size,
    id: id,
    states: enemy_container.states
  });
}
function createEnemyHelper(x,y,size,id){
  var enemy;
  var sizeVal = 40;
  if(size === 'small'){
    enemy = manager.physics.add.image(0,0, 'enemy_small').setOrigin(0.5,0.5).setDisplaySize(40, 40);
  }
  else if (size === 'medium'){
    enemy = manager.physics.add.image(0,0, 'enemy_medium').setOrigin(0.5,0.5).setDisplaySize(50, 50);
    sizeVal = 50;
  }
  else if(size === 'large'){
    enemy = manager.physics.add.image(0,0, 'enemy_large').setOrigin(0.5,0.5).setDisplaySize(100, 100);
    sizeVal = 100;
  }
  else if(size === 'huge'){
    enemy = manager.physics.add.image(0,0, 'enemy_huge').setOrigin(0.5,0.5).setDisplaySize(150, 150);
    sizeVal = 150;
  }
  else if(size === 'snake'){
    enemy = manager.physics.add.image(0,0, 'george_snake').setOrigin(0.5,0.5).setDisplaySize(100, 100);
    sizeVal = 100;
  }

  //enemy.setTint(colors['red']);
  // Order here is IMPORTANT until late code is added for layers.
  var states = createStates(sizeVal);

  var text = manager.add.text(0,0,id);
  text.style.setFont("Arial");
  text.style.setFontSize('20px');
  text.style.setColor('black');
  text.setOrigin(0.5, 0.5);
  if(size == 'snake'){
    text.text = 'George';
    text.setPosition(0,-50);
  }

  var enemy_container = manager.add.container(x, y,[enemy, text, states]);
  enemy_container.id = id;
  enemy_container.states = {knockedDown: false, incaped: false};
  enemy_container.sizeVal = sizeVal;
  return enemy_container;
}

function createStates(size){
  var down = manager.add.sprite(0,0, 'state_knocked_down').setOrigin(0.5,0.5).setDisplaySize(size,size);
  down.alpha = 0.0;
  var incap = manager.add.sprite(0,0, 'state_incap').setOrigin(0.5,0.5).setDisplaySize(size,size);
  incap.alpha = 0.0;
  var states = manager.add.container(0,0,[down, incap]);
  return(states);
}

// TODO
// Many issues currently due to fact map is not a constant size and custom offsets are often needed.
function setMap(form){
  var map = form[0].value;
  console.log(map);
}
// Grab latest data from spreadsheet.
function getCharAC(){
  manager.socket.emit('getCharAC',{});
}
// End DM Tools.

// ----- MISC FUNCTIONS ----- //
function rollDice(diceForm){
  var diceString = diceForm[0].value;
  var roll = DICE_rollDice(diceString);
  updateDiceOutcomes(roll, 'You');
  manager.socket.emit('relayMessage',{message:'diceRoll', data: {name: manager.tile.getAt(1).text, roll: roll}});
}
function updateDiceOutcomes(roll, roller_name){
  var innerhtml = document.getElementById("dice_outcomes").innerHTML;
  var str = `<li><b>${roller_name}</b> rolled ${roll.outcome}! | Rolls: ${JSON.stringify(roll.rollsOutcomes)}+${roll.fixedAdd}</li>${innerhtml}`;
  document.getElementById("dice_outcomes").innerHTML = str;
}

// ----- END MISC FUNCTIONS ----- //

//相手の関数.
function distance(x1,x2,y1,y2){
  return Math.sqrt(Math.pow(x2-x1,2)+Math.pow(y2-y1,2));
}
