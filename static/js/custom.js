$(document).ready(function() {
  $(".button-collapse").sideNav({closeOnClick: true});
  $(".modal").modal();
  openTab(null, 'addteam');
});

var socket = io();

socket.on('connect', function() {
  updateStatus(true);
});

socket.on('disconnect', function() {
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
    auto_land: $("#auto_land")[0].checked,
    auto_sample: $("#auto_sample")[0].checked,
    auto_claim: $("#auto_claim")[0].checked,
    auto_park: $("#auto_park")[0].checked,
    tele_gold_center: Number($("#tele_gold_center").val()),
    tele_silver_center: Number($("#tele_silver_center").val()),
    tele_gold_depot: Number($("#tele_gold_depot").val()),
    tele_silver_depot: Number($("#tele_silver_depot").val()),
    end_latched: $("#end_latched")[0].checked,
    end_parked_crater: $("#end_parked_crater")[0].checked,
    end_parked_full: $("#end_parked_full")[0].checked
  };

  socket.emit("addteam", data);
}

socket.on("addteam", function(msg) {
  if (msg === "success") {
    Materialize.toast("Successfully added team!");

    $("input").removeAttr("disabled");
    $("input").removeClass("valid");
    $("input").removeClass("invalid");
    $("input").val("");
    $("input[type='checkbox']").each(function(e) {
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
    field:  Number($("#match_field").val()),
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

socket.on("addmatch", function(msg) {
  if (msg === "success") {
    Materialize.toast("Successfully added match!");

    $("input").removeAttr("disabled");
    $("input").removeClass("valid");
    $("input").removeClass("invalid");
    $("input").val("");
    $("input[type='checkbox']").each(function(e) {
      $(this)[0].checked = false;
    });
    Materialize.updateTextFields();
  } else {
    Materialize.toast("Error adding match!");
    $("input").removeAttr("disabled");
  }
});

socket.on("teamlist", function(_teamList) {
  teamList = _teamList;
  renderTeams();
});

socket.on("newteam", function(teamData) {
  teamList.add(teamData);
  Materialize.toast("New team added!");
  renderTeams();
});

socket.on("matchlist", function(_matchList) {
  matchList = _matchList;
  $("#match_list").empty();
  matchList.forEach(function(match) {
    $("#match_list").append(getMatchTableRow(match));
  });
});

socket.on("newmatch", function(matchData) {
  matchList.add(matchData);
  $("#match_list").append(getMatchTableRow(matchData));
  Materialize.toast("New match added!");
});

function renderTeams() {
  $("#teamsTable").empty();
  teamList.forEach(function(team) {
    $("#teamsTable").append(getTeamTableRow(team));
  });
}

function teamModal(teamNumber) {
  console.log(teamNumber);
  $("#teamModal").modal("open");
  $("#teamModalNumber").text(teamNumber);

  teamList.forEach(function(team) {
    if (team.number === teamNumber) {
      $("#teamModalName").text("Name: " + (team.name === "" ? "Unknown" : team.name));
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
