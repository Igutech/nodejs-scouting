var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var handlebars = require('express-handlebars');
var mongoose = require('mongoose');
var Team = require("./schemas/team.js");
var Match = require("./schemas/match.js");
var getList = require("./matchScraper.js")

app.disable('x-powered-by');

app.set('view engine', 'handlebars');
//Sets handlebars configurations
app.engine('handlebars', handlebars({
  layoutsDir: __dirname + '/views/layouts',
}));
app.use(require('body-parser').urlencoded({
  extended: true
}));
app.use(express.static('public'))
app.use(express.static(__dirname + '/node_modules'));

//mongoose.connect('mongodb://mongo:27017/Scouting');
mongoose.connect('mongodb://127.0.0.1:27017/Scouting');
var db = mongoose.connection;
db.on('error', function (error) {
  console.log("ERROR: Failed to connect to DB: " + error);
  process.exit(-1);
});
db.once('open', function () {
  console.log("Connected to DB. Listening for connections.");

  server.listen(4200, "0.0.0.0")

});

io.on('connection', function (socket) {
  //New connection! Send initialiation data.
  console.log("New connection!");
  socket.on("addteam", function (data) {
    console.log("New team: " + data.number);
    addTeam(data, socket);
  });

  Team.find({}, function (err, teams) {
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

  Match.find({}).sort({
    number: 1
  }).exec(function (err, matches) {
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

  socket.on("button", function (msg) {
    if (msg == "matchScrape") {
      scrapeMatches();
    }
  });

  socket.on("addmatch", function (data) {
    console.log("New match: " + data.number);
    addMatch(data, socket);
  });
});

app.get('/', (req, res) => {
  res.render('home', {
    layout: 'index',
  });
});


app.get("/addMatch", function (req, res) {
  res.render('addMatch', {
    layout: 'index',
  });
});

app.get("/viewTeams", function (req, res) {

  res.render('viewTeams', {
    layout: 'index',
  });
});

app.get("/viewMatch", function (req, res) {

  res.render('viewMatch', {
    layout: 'index'
  });
});
app.get("/predictMatch", function (req, res) {
  res.render('predictMatch', {
    layout: 'index',
  });
});

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

  Team.find({
    number: teamData.number
  }, function (err, teams) {
    if (err || teams.length == 0) {
      newTeam.save(function (saveErr, newTeam) {
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
      teams[0].save(function (err, updatedTeam) {
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

function sendNewTeamNotification(teamData, socket) {
  io.emit('newteam', teamData);
}

function sendNewMatchNotification(matchData, socket) {
  io.emit('newmatch', matchData);
  var winner = "Tie";
  if (matchData.scores.red.total > matchData.scores.blue.total)
    winner = "Red";
  if (matchData.scores.red.total < matchData.scores.blue.total)
    winner = "Blue";
  //discord.newMatch(matchData.number, matchData.field, matchData.scores, winner,
  //                  matchData.teams.red[0], matchData.teams.red[1],
  //                  matchData.teams.blue[0], matchData.teams.blue[1]);
}

function addMatch(matchData, socket) {
  var newMatch = new Match({
    number: matchData.number,
    field: matchData.field,
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

  newMatch.save(function (saveErr, newMatch) {
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

function calculateOPROverall(teams, matches) {
  var teamNumbers = [];
  for (var i = 0; i < teams.length; i++) {
    teamNumbers.push(teams[i].number);
  }

  var Ar = math.zeros(matches.length, teams.length);
  var Ab = math.zeros(matches.length, teams.length);
  var Mr = math.zeros(matches.length, 1);
  var Mb = math.zeros(matches.length, 1);

  var Ao = math.zeros(2 * matches.length, teams.length);
  var Mo = math.zeros(2 * matches.length, 1);

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

  var Ao = math.zeros(2 * matches.length, teams.length);
  var Mo = math.zeros(2 * matches.length, 1);

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

  var Ao = math.zeros(2 * matches.length, teams.length);
  var Mo = math.zeros(2 * matches.length, 1);

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

  var Ao = math.zeros(2 * matches.length, teams.length);
  var Mo = math.zeros(2 * matches.length, 1);

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
  console.log("doing post processing");
  Match.find({}).exec(function (err, matches) {
    if (err) {
      console.log("Error processing matches for calculations:" + err);
      return;
    }

    Team.find({}, function (err2, teams) {

      if (err2) {
        console.log("Error processing matches for calculations:" + err);
        return;
      }

      var opr = [];
      var oprauto = [];
      var oprtele = [];
      var oprend = [];
      try {
        opr = calculateOPROverall(teams, matches);
        oprauto = calculateOPRAuto(teams, matches);
        oprtele = calculateOPRTele(teams, matches);
        oprend = calculateOPREnd(teams, matches);
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
        Team.update({
          number: teamNumber
        }, {
          opr: {
            overall: Number(parseFloat(opr[i])),
            auto: Number(parseFloat(oprauto[i])),
            tele: Number(parseFloat(oprtele[i])),
            end: Number(parseFloat(oprend[i]))

          }
        }, function (err, team) {});
      }

      console.log("Finished calculating OPR ratings for all teams.");

      Match.find({}).sort({
        number: 1
      }).exec(function (err, matches) {
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

      Team.find({}, function (err, teams) {
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

function scrapeMatches() {
  getList().then((result => {
    for (var i = 0; i < result.length; i++) {
      let data = {
        number: result[i].number,
        field: result[i].field,
        scores: {
          blue: {
            score: result[i].blue_score,
            penalty: result[i].blue_penalty,
            auto: result[i].blue_auto,
            tele: result[i].blue_tele,
            end: result[i].blue_end
          },
          red: {
            score: result[i].red_score,
            penalty: result[i].red_penalty,
            auto: result[i].red_auto,
            tele: result[i].red_tele,
            end: result[i].red_end
          }
        },
        teams: {
          red: [result[i].redTeam_one, result[i].redTeam_two],
          blue: [result[i].blueTeam_one, result[i].blueTeam_two]
        }
      }
      addMatch(data)
    }
  })).catch(console.error)
}