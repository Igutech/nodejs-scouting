$(document).ready(function() {
  $(".button-collapse").sideNav({closeOnClick: true});
  openTab(null, 'addteam');
});

var socket = io();

var teamList = [];
var matchList = [];

function openTab(event, tabname) {
  $(".tabcontent").hide();
  $("." + tabname).show();
}

function sendAddTeam() {
  $("input").attr("disabled", "disabled");
  var data = {
    name: $("#team_name").val(),
    number: Number($("#team_number").val()),
    auto_jewel: $("#auto_jewel")[0].checked,
    auto_glyphs_scored: Number($("#auto_glyphs_scored").val()),
    auto_pictograph_bonus: $("#auto_pictograph_bonus")[0].checked,
    auto_safe_zone: $("#auto_safe_zone")[0].checked,
    tele_glyphs_scored: Number($("#tele_glyphs_scored").val()),
    tele_cipher: $("#tele_cipher")[0].checked,
    tele_relic_zone_1: Number($("#tele_relic_zone_1").val()),
    tele_relic_zone_2: Number($("#tele_relic_zone_2").val()),
    tele_relic_zone_3: Number($("#tele_relic_zone_3").val()),
    tele_relic_upright: Number($("#tele_relic_upright").val()),
    tele_balanced: $("#tele_balanced")[0].checked
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
});

socket.on("newteam", function(teamData) {
  teamList.add(teamData);
  Materialize.toast("New team added!");
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
  $("match_list").append(getMatchTableRow(matchData));
  Materialize.toast("New match added!");
});

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
