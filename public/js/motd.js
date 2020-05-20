MOTDS = [
  `'Eugenics is so yesterday, Slavery is IN now' ~Owen`,
  'Zero days since last murder hobo incident.',
  'Elf eugenics is a way many would consider... Unnatural...',
  `'I'm gonna shove some sharp sticks into this mine to dampan the blow' ~Yerti`,
  `Critical Potato!`,
  `'I would like to enter a frenzied rage' ~Arvid`,
]

document.getElementById('motd_title').innerHTML = MOTDS[Math.floor(Math.random()*MOTDS.length)];
