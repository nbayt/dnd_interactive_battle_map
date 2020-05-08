// Pass in a string of type [NUM]d[NUM]+[NUM]+...
// EG: 4d8+1+2d6 and get a roll for that dice equation.
// Returns 0 if you give it something bad, give it something it can parse and you get a number.
function rollDice(diceString){
  try{
    diceString = diceString.toLowerCase();
    diceString = diceString.replace(/[^\+0-9d]/g,''); // ようくない文字を外す
    var diceRolls = [];
    var fixedAdd = 0;
    var diceParts = diceString.split('+');
    diceParts.forEach(function(dice){
      var c_s = dice.split('d');
      if(c_s.length==1){
        fixedAdd+=parseInt(c_s);
      }
      else{
        for(var i=0;i<parseInt(c_s[0]);i++){
          diceRolls.push(parseInt(c_s[1]));
        }
      }
    });
    diceRolls.forEach(function(die){
      fixedAdd += Math.floor(Math.random() * die)+1;
    })
    if(!fixedAdd || fixedAdd === NaN){ // お前たちがうるさいですよ！
      return(0);
    }
    else{
      return(fixedAdd);
    }
  }
  catch(e){ // Just in case
    return(0);
  }
}
