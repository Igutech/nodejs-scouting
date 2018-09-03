var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var mongoose = require('mongoose');
var request = require('request');
var math = require('mathjs');
let config = require("./config.json");
var discord;

mongoose.connect('mongodb://localhost:27017/Scouting');
var db = mongoose.connection;
db.on('error', function(error) {
  console.log("ERROR: Failed to connect to DB: " + error);
  process.exit(-1);
});
db.once('open', function() {
  console.log("Connected to DB. Listening for connections.");
  if (!config.toa_disable) {
    getOfficialTeamsList(function() {
      if (!config.toa_match_disable) {
        var period = config.match_fetch_period;
        if (config.match_fetch_period < 30000) {
          console.log("Match fetch period must be at least 30000 ms to avoid TOA rate limits.");
          console.log("Using 30000 ms as period.");
          period = 30000;
        }
        setInterval(getMatchData, period);
        getMatchData();
      }
    });
  }
  server.listen(4200, "0.0.0.0");
  if (config.discord_enable) {
    discord = require("./discord");
  }
});

var Team = require("./schemas/team.js");
var Match = require("./schemas/match.js");


app.use(express.static(__dirname + '/node_modules'));
app.use(express.static('static'));

io.on('connection', function(socket) {
  //New connection! Send initialiation data.
  console.log("New connection!");
  //TODO: Send init data

  Team.find({}, function(err, teams) {
    var newTeams = [];
    for (var i = 0; i < teams.length; i++) {
      newTeams[i] = {
        name: teams[i].name,
        number: teams[i].number,
        data: teams[i].data,
        opr: teams[i].opr
      };
    }

    socket.emit("teamlist", newTeams);
  });

  Match.find({}).sort({number: 1}).exec(function(err, matches) {
    var newMatches = [];
    for (var i = 0; i < matches.length; i++) {
      newMatches[i] = {
        number: matches[i].number,
        field: matches[i].field,
        scores: matches[i].scores,
        teams: matches[i].teams
      };
    }

    socket.emit("matchlist", newMatches);
  });

  socket.on("addteam", function(data) {
    console.log("New team: " + data.number);
    addTeam(data, socket);
  });

  socket.on("addmatch", function(data) {
    console.log("New match: " + data.number);
    addMatch(data, socket);
  });


});

function addMatch(matchData, socket) {
  var newMatch = new Match({
    number: matchData.number,
    field:  matchData.field,
    scores: {
      blue: {
        score: matchData.scores.blue.score,
        penalty: matchData.scores.blue.penalty,
        auto: matchData.scores.blue.auto,
        tele: matchData.scores.blue.tele,
        end: matchData.scores.blue.end
      },
      red: {
        score: matchData.scores.red.score,
        penalty: matchData.scores.red.penalty,
        auto: matchData.scores.red.auto,
        tele: matchData.scores.red.tele,
        end: matchData.scores.red.end
      }
    },
    teams: {
      red: [matchData.teams.red[0], matchData.teams.red[1]],
      blue: [matchData.teams.blue[0], matchData.teams.blue[1]]
    }
  });

  newMatch.save(function(saveErr, newMatch) {
    if (saveErr) {
      socket.emit("addmatch", "error");
      console.log("Error submitting match: " + saveErr);
    } else {
      socket.emit("addmatch", "success");
      sendNewMatchNotification(matchData, socket);
      doProcessMatchResults();
    }
  });
}

function addTeam(teamData, socket) {
  var teamDataCopy = JSON.parse(JSON.stringify(teamData));
  delete teamDataCopy.name;
  delete teamDataCopy.number;
  var newTeam = new Team({
    number: teamData.number,
    name: teamData.name,
    data: teamDataCopy,
    opr: 1
  });

  Team.find({number: teamData.number}, function(err, teams) {
    if (err || teams.length == 0) {
      newTeam.save(function(saveErr, newTeam) {
        if (saveErr) {
          socket.emit("addteam", "error");
          console.log("Error submitting team: " + saveErr);
        } else {
          socket.emit("addteam", "success");
          sendNewTeamNotification(teamData, socket);
        }
      });
    } else {
      teams[0].set({
        name: teamData.name,
        data: teamDataCopy,
        opr: 1
      });
      teams[0].save(function(err, updatedTeam) {
        if (err) {
          socket.emit("addteam", "error");
          console.log("Error submitting team: " + err);
        } else {
          socket.emit("addteam", "success");
          sendNewTeamNotification(teamData, socket);
        }
      });
    }
  });

}

function getOfficialTeamsList(callback) {
  console.log("Retreiving official teams list...");
  request({
    url: 'https://theorangealliance.org/apiv2/event/' + config.event_key + "/rankings",
    headers: {
      'X-Application-Origin': config.application_name,
      'X-TOA-Key': config.toa_key
    }
  }, function(error, response, body) {
    if (!error && !JSON.parse(body).status) {
      var res = JSON.parse(body);
      console.log("Got teams data.");

      for (var i = 0; i < res.length; i++) {
        var newTeam = new Team({
          number: res[i].team_key,
          name: "",
          data: {},
          opr: 1
        });

        newTeam.save(function(saveErr, newTeam) {});
      }
      callback();
    }
  });
}

function getMatchData() {
  console.log("Retreiving match data for event: " + config.event_key);
  request({
    url: 'https://theorangealliance.org/apiv2/event/' + config.event_key + "/matches",
    headers: {
      'X-Application-Origin': config.application_name,
      'X-TOA-Key': config.toa_key
    }
  }, function(error, response, body) {
    if (!error && !JSON.parse(body).status) {
      var res = JSON.parse(body);
      console.log("Got match data");

      request({
        url: 'https://theorangealliance.org/apiv2/event/' + config.event_key + "/matches/stations",
        headers: {
          'X-Application-Origin': config.application_name,
          'X-TOA-Key': config.toa_key
        }
      }, function(error2, response2, stationsbody) {

        if (!error && !JSON.parse(stationsbody).status) {
          var stationsres = JSON.parse(stationsbody);
          console.log("Got stations data");

          for (var i = 0; i < res.length; i++) {
            var match = res[i];
            if (match.match_name.split(" ")[0] != "Quals") {
              //Not a qualification match, skip it
              continue;
            }

            var matchNumber = parseInt(match.match_name.split(" ")[1]);
            var field = parseInt(match.field);
            var scores = {
              blue: {
                score: match.blue_score,
                penalty: match.blue_penalty,
                auto: match.blue_auto_score,
                tele: match.blue_tele_score,
                end: match.blue_end_score
              },
              red: {
                score: match.red_score,
                penalty: match.red_penalty,
                auto: match.red_auto_score,
                tele: match.red_tele_score,
                end: match.red_end_score
              }
            };
            var teamslist = stationsres[i].teams.split(",");
            var teams = {
              red: [teamslist[0], teamslist[1]],
              blue: [teamslist[2], teamslist[3]]
            };

            var newMatch = new Match({
              number: matchNumber,
              field: field,
              scores: scores,
              teams: teams
            });

            newMatch.save(function(err, newMatch) {});
          }

          doProcessMatchResults();
        } else {
          console.log("Could not recieve stations results: " + stationsbody);
        }

      });



    } else {
      console.log("Could not recieve match results: " + body);
    }
  });
}

function calculateOPROverall(teams, matches) {
  var teamNumbers = [];
  for (var i = 0; i < teams.length; i++) {
    teamNumbers.push(teams[i].number);
  }

  var Ar = math.zeros(matches.length, teams.length);
  var Ab = math.zeros(matches.length, teams.length);
  var Mr = math.zeros(matches.length, 1);
  var Mb = math.zeros(matches.length, 1);

  var Ao = math.zeros(2*matches.length, teams.length);
  var Mo = math.zeros(2*matches.length, 1);

  var match = 0;
  var totalScore = 0;
  for (var i = 0; i < matches.length; i++) {

    for (var j = 0; j < 2; j++) {
      Ar.subset(math.index(match, teamNumbers.indexOf(parseInt(matches[i].teams.red[j]))), 1);
      Ab.subset(math.index(match, teamNumbers.indexOf(parseInt(matches[i].teams.blue[j]))), 1);
    }

    Mr.subset(math.index(match, 0), matches[i].scores.red.score);
    Mb.subset(math.index(match, 0), matches[i].scores.blue.score);

    totalScore += matches[i].scores.red.score;
    totalScore += matches[i].scores.blue.score;

    match++;

  }

  copyMatrix(Ao, 0, 0, Ar);
  copyMatrix(Ao, matches.length, 0, Ab);

  var meanTeamOffense = totalScore / (matches.length * 2 * 2);
  for (var i = 0; i < matches.length; i++) {
    Mr.subset(math.index(i, 0), Mr.subset(math.index(i, 0)) - 2 * meanTeamOffense);
    Mb.subset(math.index(i, 0), Mb.subset(math.index(i, 0)) - 2 * meanTeamOffense);
  }

  copyMatrix(Mo, 0, 0, Mr);
  copyMatrix(Mo, matches.length, 0, Mb);

  var matchMatrixInverse = math.inv(math.add(math.multiply(math.transpose(Ao), Ao), math.multiply(math.eye(teams.length), config.mmse)));

  var opr = [];
  var Oprm = math.multiply(matchMatrixInverse, math.multiply(math.transpose(Ao), Mo));
  for (var i = 0; i < teams.length; i++) {
    Oprm.subset(math.index(i, 0), Oprm.subset(math.index(i, 0)) + meanTeamOffense);
    opr[i] = Oprm.subset(math.index(i, 0));
  }

  console.log("Finished calculating Overall OPR for " + teamNumbers.length + " teams.");
  return opr;
}

function calculateOPRAuto(teams, matches) {
  var teamNumbers = [];
  for (var i = 0; i < teams.length; i++) {
    teamNumbers.push(teams[i].number);
  }

  var Ar = math.zeros(matches.length, teams.length);
  var Ab = math.zeros(matches.length, teams.length);
  var Mr = math.zeros(matches.length, 1);
  var Mb = math.zeros(matches.length, 1);

  var Ao = math.zeros(2*matches.length, teams.length);
  var Mo = math.zeros(2*matches.length, 1);

  var match = 0;
  var totalScore = 0;
  for (var i = 0; i < matches.length; i++) {

    for (var j = 0; j < 2; j++) {
      Ar.subset(math.index(match, teamNumbers.indexOf(parseInt(matches[i].teams.red[j]))), 1);
      Ab.subset(math.index(match, teamNumbers.indexOf(parseInt(matches[i].teams.blue[j]))), 1);
    }

    Mr.subset(math.index(match, 0), matches[i].scores.red.auto);
    Mb.subset(math.index(match, 0), matches[i].scores.blue.auto);

    totalScore += matches[i].scores.red.auto;
    totalScore += matches[i].scores.blue.auto;

    match++;

  }

  copyMatrix(Ao, 0, 0, Ar);
  copyMatrix(Ao, matches.length, 0, Ab);

  var meanTeamOffense = totalScore / (matches.length * 2 * 2);
  for (var i = 0; i < matches.length; i++) {
    Mr.subset(math.index(i, 0), Mr.subset(math.index(i, 0)) - 2 * meanTeamOffense);
    Mb.subset(math.index(i, 0), Mb.subset(math.index(i, 0)) - 2 * meanTeamOffense);
  }

  copyMatrix(Mo, 0, 0, Mr);
  copyMatrix(Mo, matches.length, 0, Mb);

  var matchMatrixInverse = math.inv(math.add(math.multiply(math.transpose(Ao), Ao), math.multiply(math.eye(teams.length), config.mmse)));

  var opr = [];
  var Oprm = math.multiply(matchMatrixInverse, math.multiply(math.transpose(Ao), Mo));
  for (var i = 0; i < teams.length; i++) {
    Oprm.subset(math.index(i, 0), Oprm.subset(math.index(i, 0)) + meanTeamOffense);
    opr[i] = Oprm.subset(math.index(i, 0));
  }

  console.log("Finished calculating Autonomous OPR for " + teamNumbers.length + " teams.");
  return opr;
}

function calculateOPRTele(teams, matches) {
  var teamNumbers = [];
  for (var i = 0; i < teams.length; i++) {
    teamNumbers.push(teams[i].number);
  }

  var Ar = math.zeros(matches.length, teams.length);
  var Ab = math.zeros(matches.length, teams.length);
  var Mr = math.zeros(matches.length, 1);
  var Mb = math.zeros(matches.length, 1);

  var Ao = math.zeros(2*matches.length, teams.length);
  var Mo = math.zeros(2*matches.length, 1);

  var match = 0;
  var totalScore = 0;
  for (var i = 0; i < matches.length; i++) {

    for (var j = 0; j < 2; j++) {
      Ar.subset(math.index(match, teamNumbers.indexOf(parseInt(matches[i].teams.red[j]))), 1);
      Ab.subset(math.index(match, teamNumbers.indexOf(parseInt(matches[i].teams.blue[j]))), 1);
    }

    Mr.subset(math.index(match, 0), matches[i].scores.red.tele);
    Mb.subset(math.index(match, 0), matches[i].scores.blue.tele);

    totalScore += matches[i].scores.red.tele;
    totalScore += matches[i].scores.blue.tele;

    match++;

  }

  copyMatrix(Ao, 0, 0, Ar);
  copyMatrix(Ao, matches.length, 0, Ab);

  var meanTeamOffense = totalScore / (matches.length * 2 * 2);
  for (var i = 0; i < matches.length; i++) {
    Mr.subset(math.index(i, 0), Mr.subset(math.index(i, 0)) - 2 * meanTeamOffense);
    Mb.subset(math.index(i, 0), Mb.subset(math.index(i, 0)) - 2 * meanTeamOffense);
  }

  copyMatrix(Mo, 0, 0, Mr);
  copyMatrix(Mo, matches.length, 0, Mb);

  var matchMatrixInverse = math.inv(math.add(math.multiply(math.transpose(Ao), Ao), math.multiply(math.eye(teams.length), config.mmse)));

  var opr = [];
  var Oprm = math.multiply(matchMatrixInverse, math.multiply(math.transpose(Ao), Mo));
  for (var i = 0; i < teams.length; i++) {
    Oprm.subset(math.index(i, 0), Oprm.subset(math.index(i, 0)) + meanTeamOffense);
    opr[i] = Oprm.subset(math.index(i, 0));
  }

  console.log("Finished calculating Teleop OPR for " + teamNumbers.length + " teams.");
  return opr;
}

function calculateOPREnd(teams, matches) {
  var teamNumbers = [];
  for (var i = 0; i < teams.length; i++) {
    teamNumbers.push(teams[i].number);
  }

  var Ar = math.zeros(matches.length, teams.length);
  var Ab = math.zeros(matches.length, teams.length);
  var Mr = math.zeros(matches.length, 1);
  var Mb = math.zeros(matches.length, 1);

  var Ao = math.zeros(2*matches.length, teams.length);
  var Mo = math.zeros(2*matches.length, 1);

  var match = 0;
  var totalScore = 0;
  for (var i = 0; i < matches.length; i++) {

    for (var j = 0; j < 2; j++) {
      Ar.subset(math.index(match, teamNumbers.indexOf(parseInt(matches[i].teams.red[j]))), 1);
      Ab.subset(math.index(match, teamNumbers.indexOf(parseInt(matches[i].teams.blue[j]))), 1);
    }

    Mr.subset(math.index(match, 0), matches[i].scores.red.end);
    Mb.subset(math.index(match, 0), matches[i].scores.blue.end);

    totalScore += matches[i].scores.red.end;
    totalScore += matches[i].scores.blue.end;

    match++;

  }

  copyMatrix(Ao, 0, 0, Ar);
  copyMatrix(Ao, matches.length, 0, Ab);

  var meanTeamOffense = totalScore / (matches.length * 2 * 2);
  for (var i = 0; i < matches.length; i++) {
    Mr.subset(math.index(i, 0), Mr.subset(math.index(i, 0)) - 2 * meanTeamOffense);
    Mb.subset(math.index(i, 0), Mb.subset(math.index(i, 0)) - 2 * meanTeamOffense);
  }

  copyMatrix(Mo, 0, 0, Mr);
  copyMatrix(Mo, matches.length, 0, Mb);

  var matchMatrixInverse = math.inv(math.add(math.multiply(math.transpose(Ao), Ao), math.multiply(math.eye(teams.length), config.mmse)));

  var opr = [];
  var Oprm = math.multiply(matchMatrixInverse, math.multiply(math.transpose(Ao), Mo));
  for (var i = 0; i < teams.length; i++) {
    Oprm.subset(math.index(i, 0), Oprm.subset(math.index(i, 0)) + meanTeamOffense);
    opr[i] = Oprm.subset(math.index(i, 0));
  }

  console.log("Finished calculating Endgame OPR for " + teamNumbers.length + " teams.");
  return opr;
}

function doProcessMatchResults() {
  Match.find({}).exec(function(err, matches) {
    if (err) {
      console.log("Error processing matches for calculations:" + err);
      return;
    }

    Team.find({}, function(err2, teams) {

      if (err2) {
        console.log("Error processing matches for calculations:" + err);
        return;
      }

      var opr = [];
      var oprauto = [];
      var oprtele = [];
      var oprend = [];
      try {
        opr =  calculateOPROverall(teams, matches);
        oprauto = calculateOPRAuto(teams, matches);
        oprtele = calculateOPRTele(teams, matches);
        oprend  = calculateOPREnd (teams, matches);
      } catch (e) {
        for (var i = 0; i < teams.length; i++) {
          opr[i] = 1;
          oprauto[i] = 1;
          oprtele[i] = 1;
          oprend[i] = 1;
        }
        console.log("Not enough matches to calculate OPR rating yet!");
      }

      for (var i = 0; i < teams.length; i++) {
        var teamNumber = teams[i].number;
        Team.update({number: teamNumber}, {opr: {
          overall: Number(parseFloat(opr[i])),
          auto: Number(parseFloat(oprauto[i])),
          tele: Number(parseFloat(oprtele[i])),
          end:  Number(parseFloat(oprend[i]))

        }}, function(err, team) {});
      }

      console.log("Finished calculating OPR ratings for all teams.");

      Match.find({}).sort({number: 1}).exec(function(err, matches) {
        var newMatches = [];
        for (var i = 0; i < matches.length; i++) {
          newMatches[i] = {
            number: matches[i].number,
            field: matches[i].field,
            scores: matches[i].scores,
            teams: matches[i].teams
          };
        }

        io.emit("matchlist", newMatches);
      });

      Team.find({}, function(err, teams) {
        var newTeams = [];
        for (var i = 0; i < teams.length; i++) {
          newTeams[i] = {
            name: teams[i].name,
            number: teams[i].number,
            data: teams[i].data,
            opr: teams[i].opr
          };
        }

        io.emit("teamlist", newTeams);
      });

    });

  });
}

//Copy the contents of srcmat into dstmat starting at i, j
function copyMatrix(dstMat, starti, startj, srcmat) {
  var srci = 0;
  var srcj = 0;
  for (var i = starti; i < starti + srcmat.size()[0]; i++) {
    srcj = 0;
    for (var j = startj; j < startj + srcmat.size()[1]; j++) {
      dstMat.subset(math.index(i, j), srcmat.subset(math.index(srci, srcj)));
      srcj++;
    }
    srci++;
  }
}

function sendNewMatchNotification(matchData, socket) {
  io.emit('newmatch', matchData);
  var winner = "Tie";
  if (matchData.scores.red.total > matchData.scores.blue.total)
    winner = "Red";
  if (matchData.scores.red.total < matchData.scores.blue.total)
    winner = "Blue";
  discord.newMatch(matchData.number, matchData.field, matchData.scores, winner,
                    matchData.teams.red[0], matchData.teams.red[1],
                    matchData.teams.blue[0], matchData.teams.blue[1]);
}

function sendNewTeamNotification(teamData, socket) {
  io.emit('newteam', teamData);
}
