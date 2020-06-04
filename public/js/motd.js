MOTDS = [
  `'Eugenics is so yesterday, Slavery is IN now' ~Owen`,
  'Zero days since last murder hobo incident.',
  `'I'm gonna shove some sharp sticks into this mine to dampen the blow' ~Yerti`,
  `Critical Potato!`,
  `'I would like to enter a frenzied rage' ~Arvid`,
  `'I think I've made my intentions VERY clear' ~Old Man Waterfall`,
  `'(Insert any quote here)' ~Literally anyone in this chat`,
  `"It's not racism if it keeps my money in my pocket" ~Nick`,
];

document.getElementById('motd_title').innerHTML = MOTDS[Math.floor(Math.random()*MOTDS.length)];
