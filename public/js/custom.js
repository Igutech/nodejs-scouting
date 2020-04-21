$(document).ready(function () {
  $(".button-collapse").sideNav({
    closeOnClick: true
  });
  $(".modal").modal();
});

var socket = io();

socket.on('connect', function () {
  updateStatus(true);
});

socket.on('disconnect', function () {
  updateStatus(false);
});
var teamList = [];
var matchList = [];

function updateStatus(online) {
  console.log("updateStatus ran");
  if (online) {
    $("#circle").addClass("online");
    $("#circle").removeClass("offline");
    $("#onlineoffline").html("Online");
    $("#mobilecircle").addClass("online");
    $("#mobilecircle").removeClass("offline");
    $("#mobileonlineoffline").html("Online");
  } else {
    $("#circle").addClass("offline");
    $("#circle").removeClass("online");
    $("#onlineoffline").html("Offline");
    $("#mobilecircle").addClass("offline");
    $("#mobilecircle").removeClass("online");
    $("#mobileonlineoffline").html("Offline");
  }
}
$("#matchScrape").click(function () {

  socket.emit("button", "matchScrape");

});

socket.on("teamlist", function (_teamList) {
  teamList = _teamList;
  renderTeams();
});


socket.on("matchlist", function (_matchList) {
  matchList = _matchList;
  $("#match_list").empty();
  matchList.forEach(function (match) {
    $("#match_list").append(getMatchTableRow(match));
  });
});

socket.on("addteam", function (msg) {
  if (msg === "success") {
    Materialize.toast("Successfully added team!");
  } else {
    Materialize.toast("Error adding team!");
  }
});

function renderTeams() {
  $("#teamsTable").empty();
  teamList.forEach(function (team) {
    $("#teamsTable").append(getTeamTableRow(team));
  });
}

function teamModal(teamNumber) {
  console.log(teamNumber);

  $("#teamModal").modal("open");
  $("#teamModalNumber").text(teamNumber);

  teamList.forEach(function (team) {
    if (team.number === teamNumber) {
      $("#teamModalName").text("Name: " + (team.name === "" ? "Unknown" : team.name));

      //View Team Auto Calculation
      var skystoneScore = (10 * team.data.auto_Skystone);
      var skystonePlacement = 0;
      var foundationPoint = 0;
      var parkingPoint = 0;
      var autoOverall = 0;
      var skystoneDisplace = "N/A";
      if (team.data.auto_PlacedSkystone) {
        skystonePlacement = 4 * team.data.auto_Skystone;
        skystoneDisplace = "Placing"
      } else if (team.data.auto_DeliverSkystone) {
        skystonePlacement = 2 * team.data.auto_Skystone;
        skystoneDisplace = "Deliverying"
      }

      if (team.data.auto_foundation) {
        foundationPoint = 10;
      }
      if (team.data.auto_park) {
        parkingPoint = 5;
      }
      autoOverall = skystoneScore + skystonePlacement + foundationPoint + parkingPoint;
      $("#autoOverall").text(autoOverall);
      $("#autoSkystone").text(skystonePlacement + " (" + team.data.auto_Skystone + ")");
      $("#autoSkystoneDisplacement").text(skystoneDisplace);
      $("#autoFoundation").text(foundationPoint + " (" + team.data.auto_foundation + ")");
      $("#autoParking").text(parkingPoint + " (" + team.data.auto_park + ")");

      //View Team TeleOp Calculation
      // var MaxdeliverOnly = team.data.tele_maxStones_Delivered;
      var SkyScraperScore = 2 * team.data.tele_skyscraper;
      var MaxstackAsWell = 2 * team.data.tele_maxStones_Placed;
      var DeliverScore = team.data.tele_maxStones_Delivered
      var StackingScore = MaxstackAsWell + SkyScraperScore;
      var TeleOverall = 0;
      if (team.data.tele_DeliverStone) {
        TeleOverall = DeliverScore;
      } else if (team.data.tele_maxStones_Placed) {
        TeleOverall = StackingScore + SkyScraperScore;
      }
      //$("#teleOnlyDeliver").text(MaxdeliverOnly);
      $("#teleDeliverAndStack").text(MaxstackAsWell + " (" + team.data.tele_maxStones_Placed + ")");
      $("#teleSkyscraper").text(SkyScraperScore + " (" + team.data.tele_skyscraper + ")");
      $("#teleDeliver").text(DeliverScore + " (" + team.data.tele_maxStones_Delivered + ")");
      $("#teleStack").text(StackingScore + " (" + team.data.tele_maxStones_Placed + ")");

      //View Team Endgame Calculation
      var capStoneScore = 0;
      var EndgameFoundation = 0;
      var EndgameParking = 0;
      if (team.data.end_capstone) {
        capStoneScore = team.data.tele_skyscraper + 5;
      }
      if (team.data.end_foundation) {
        EndgameFoundation = 15;
      }
      if (team.data.end_park) {
        EndgameParking = 5;
      }

      var finalScore = autoOverall + TeleOverall + capStoneScore + EndgameFoundation + EndgameParking;
      $("#endCapstone").text(team.data.end_capstone);
      $("#endCapstoneScore").text(capStoneScore);
      $("#endFoundationScore").text(EndgameFoundation + " (" + team.data.end_foundation + ")");
      $("#finalScore").text(finalScore);
      var remember = document.getElementById("raw_data");


      if (isNaN(team.opr)) {
        $("#oprOverall").text(team.opr.overall.toFixed(2));
        $("#oprAuto").text(team.opr.auto.toFixed(2));
        $("#oprTele").text(team.opr.tele.toFixed(2));
        $("#oprEnd").text(team.opr.end.toFixed(2));
      }
    }

  });
}


function getTeamTableRow(team) {
  var row = "<tr onClick=\"teamModal(" + team.number + ");\"><td>";
  row += team.number;
  row += "</td><td>";
  row += team.name === "" ? "?" : team.name;
  row += "</td><td>";
  var oprText = "N/A";
  if (isNaN(team.opr)) {
    oprText = team.opr.overall.toFixed(2);
  }
  row += oprText;
  row += "</td></tr>";
  return row;
}

function getMatchTableRow(matchData) {
  var winTag = "tie";
  if (matchData.scores.red.score > matchData.scores.blue.score) {
    winTag = "red-win";
  } else if (matchData.scores.blue.score > matchData.scores.red.score) {
    winTag = "blue-win";
  }
  var row = "<tr class=\"" + winTag + "\"><td>";
  row += matchData.number;
  row += "</td><td>";
  row += matchData.teams.red[0];
  row += "<br/>";
  row += matchData.teams.red[1];
  row += "</td><td>";
  row += matchData.teams.blue[0];
  row += "<br/>";
  row += matchData.teams.blue[1];
  row += "</td><td>";
  row += matchData.scores.red.score;
  row += "-";
  row += matchData.scores.blue.score;
  row += "</td></tr>";
  return row;
}