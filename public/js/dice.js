// Pass in a string of type [NUM]d[NUM]+[NUM]+...
// EG: 4d8+1+2d6 and get a roll for that dice equation.
// Returns 0 if you give it something bad, give it something it can parse and you get a number.
function DICE_rollDice(diceString){
  const defaultResponse = {outcome: -1, rolls: [], rollsOutcomes: [], fixedAdd: -1};
  if(diceString.length>200){ // NO //
    return(defaultResponse);
  }
  try{
    diceString = cleanDiceString(diceString);
    var outcome = 0;
    var diceRolls = [];
    var diceRollsOutcomes = [];
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
      var roll = Math.floor(Math.random() * die)+1;
      outcome += roll;
      diceRollsOutcomes.push(roll);
    })
    outcome += fixedAdd
    return({outcome: outcome, rolls: diceRolls, rollsOutcomes: diceRollsOutcomes, fixedAdd: fixedAdd});
  }
  catch(e){ // Just in case
    return(defaultResponse);
  }
}

function cleanDiceString(diceString){
  diceString = diceString.toLowerCase();
  diceString = diceString.replace(/[^\+\-0-9d]/g,''); // ようくない文字を外す
  return(diceString);
}
