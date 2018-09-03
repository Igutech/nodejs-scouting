const Discord = require('discord.js');
const discordclient = new Discord.Client();

discordclient.on('ready', () => {
  console.log(`Logged into discord as ${discordclient.user.tag}!`);
});

module.exports.newMatch = function(matchid, field, score, winner, red1, red2, blue1, blue2) {
  var channel = discordclient.channels.get(require("./config.json").discord_alert_channel);
  console.log(require("./config.json").discord_alert_channel);
  const embed = {
    "title": "New Match! (" + matchid + " on field " + field + ")",
    "color": 3650857,
    "thumbnail": {
      "url": "https://cdn.discordapp.com/app-icons/486187851508350978/a77ed5b28648aeba77aaea72e112aceb.png"
    },
    "author": {
      "name": "Scouting Sheet",
      "url": "http://scouting.igutech.org",
      "icon_url": "https://cdn.discordapp.com/app-icons/486187851508350978/a77ed5b28648aeba77aaea72e112aceb.png"
    },
    "fields": [
      {
        "name": "Red",
        "value": red1 + "\n" + red2 + "\n\nAutonomous: " + score.red.auto + "\nTeleop: " + score.red.tele + "\nEndgame: " + score.red.end + "\nPenalty " + score.red.penalty + "\nTotal: **" + score.red.score + "**",
        "inline": true
      },
      {
        "name": "Blue",
        "value": blue1 + "\n" + blue2 + "\n\nAutonomous: " + score.blue.auto + "\nTeleop: " + score.blue.tele + "\nEndgame: " + score.blue.end + "\nPenalty " + score.blue.penalty + "\nTotal: **" + score.blue.score + "**",
        "inline": true
      },
      {
        "name": "Winner",
        "value": winner
      }
    ]
  };

  channel.send({embed});
}

discordclient.login(require("./config.json").discord_token);
