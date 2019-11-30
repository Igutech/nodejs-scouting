$(document).ready(function () {
  $(".button-collapse").sideNav({ closeOnClick: true });
  $(".modal").modal();
  openTab(null, 'addteam');
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

function openTab(event, tabname) {
  $(".tabcontent").hide();
  $("." + tabname).show();
}

function updateStatus(online) {
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

function sendAddTeam() {
  $("input").attr("disabled", "disabled");
  var data = {
    name: $("#team_name").val(),
    number: Number($("#team_number").val()),
    auto_park: $("#auto_park")[0].checked,
    auto_foundation: $("#auto_foundation")[0].checked,
    auto_PlacedSkystone: $("#auto_PlacedSkystone")[0].checked,
    auto_DeliverSkystone: $("#auto_DeliverSkystone")[0].checked,
    tele_DeliverStone: $("#tele_DeliverStone")[0].checked,
    tele_PlaceStone: $("#tele_PlaceStone")[0].checked,
    auto_Skystone: Number($("#auto_Skystone").val()),
    tele_maxStones_Delivered: Number($("#tele_maxStones_Delivered").val()),
    tele_maxStones_Placed: Number($("#tele_maxStones_Placed").val()),
    tele_skyscraper: Number($("#tele_skyscraper").val()),
    end_capstone: $("#end_capstone")[0].checked,
    end_park: $("#end_park")[0].checked,
  };

  socket.emit("addteam", data);
}

socket.on("addteam", function (msg) {
  if (msg === "success") {
    Materialize.toast("Successfully added team!");

    $("input").removeAttr("disabled");
    $("input").removeClass("valid");
    $("input").removeClass("invalid");
    $("input").val("");
    $("input[type='checkbox']").each(function (e) {
      $(this)[0].checked = false;
    });
    Materialize.updateTextFields();
  } else {
    Materialize.toast("Error adding team!");
    $("input").removeAttr("disabled");
  }
});

function sendAddMatch() {
  $("input").attr("disabled", "disabled");
  var data = {
    number: Number($("#match_number").val()),
    field: Number($("#match_field").val()),
    scores: {
      blue: {
        score: Number($("#match_blue_score").val()),
        penalty: Number($("#match_blue_penalty").val()),
        auto: Number($("#match_blue_auto").val()),
        tele: Number($("#match_blue_tele").val()),
        end: Number($("#match_blue_end").val())
      },
      red: {
        score: Number($("#match_red_score").val()),
        penalty: Number($("#match_red_penalty").val()),
        auto: Number($("#match_red_auto").val()),
        tele: Number($("#match_red_tele").val()),
        end: Number($("#match_red_end").val())
      }
    },
    teams: {
      red: [Number($("#match_red_1").val()), Number($("#match_red_2").val())],
      blue: [Number($("#match_blue_1").val()), Number($("#match_blue_2").val())]
    }
  };

  socket.emit("addmatch", data);
}

socket.on("addmatch", function (msg) {
  if (msg === "success") {
    Materialize.toast("Successfully added match!");

    $("input").removeAttr("disabled");
    $("input").removeClass("valid");
    $("input").removeClass("invalid");
    $("input").val("");
    $("input[type='checkbox']").each(function (e) {
      $(this)[0].checked = false;
    });
    Materialize.updateTextFields();
  } else {
    Materialize.toast("Error adding match!");
    $("input").removeAttr("disabled");
  }
});

socket.on("teamlist", function (_teamList) {
  teamList = _teamList;
  renderTeams();
});

socket.on("newteam", function (teamData) {
  teamList.add(teamData);
  Materialize.toast("New team added!");
  renderTeams();
});

socket.on("matchlist", function (_matchList) {
  matchList = _matchList;
  $("#match_list").empty();
  matchList.forEach(function (match) {
    $("#match_list").append(getMatchTableRow(match));
  });
});

socket.on("newmatch", function (matchData) {
  matchList.add(matchData);
  $("#match_list").append(getMatchTableRow(matchData));
  Materialize.toast("New match added!");
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
      if (team.data.auto_PlacedSkystone) { skystonePlacement = 4 * team.data.auto_Skystone; }
      else if (team.data.auto_DeliverSkystone) { skystonePlacement = 2 * team.data.auto_Skystone; }

      if (team.data.auto_foundation) { foundationPoint = 10; }
      if (team.data.auto_park) { parkingPoint = 5; }
      autoOverall = skystoneScore + skystonePlacement + foundationPoint + parkingPoint;
      $("#autoOverall").text(autoOverall);
      $("#autoSkystone").text(team.data.auto_Skystone);
      $("#autoFoundation").text(team.data.auto_foundation);
      $("#autoParking").text(team.data.auto_park);

      //View Team TeleOp Calculation
      // var MaxdeliverOnly = team.data.tele_maxStones_Delivered;
      var SkyScraperScore = 2 * team.data.tele_skyscraper;
      var MaxstackAsWell = 2 * team.data.tele_maxStones_Placed;
      var DeliverScore = team.data.tele_maxStones_Delivered
      var StackingScore = MaxstackAsWell + SkyScraperScore;
      var TeleOverall = 0;
      if (team.data.tele_DeliverStone) { TeleOverall = DeliverScore; }
      else if (team.data.tele_maxStones_Placed) { TeleOverall = StackingScore + SkyScraperScore; }
      //$("#teleOnlyDeliver").text(MaxdeliverOnly);
      $("#teleDeliverAndStack").text(MaxstackAsWell);
      $("#teleSkyscraper").text(SkyScraperScore);
      $("#teleDeliver").text(DeliverScore);
      $("#teleStack").text(StackingScore);

      //View Team Endgame Calculation
      var capStoneScore = 0;
      var EndgameFoundation = 0;
      var EndgameParking = 0;
      if (team.data.end_capstone) { capStoneScore = team.data.tele_skyscraper + 5; }
      if (team.data.EndgameFoundation) { EndgameFoundation = 15; }
      if (team.data.EndgameParking) { EndgameParking = 5; }

      var finalScore = autoOverall + TeleOverall + capStoneScore + EndgameFoundation + EndgameParking;

      $("#endCapstone").text(team.data.end_capstone);
      $("#endCapstoneScore").text(capStoneScore);
      $("#finalScore").text(finalScore);


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
