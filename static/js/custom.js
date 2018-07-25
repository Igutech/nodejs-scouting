$(document).ready(function() {
  $(".button-collapse").sideNav({closeOnClick: true});
  openTab(null, 'addteam');
});

var socket = io();

var teamList = [];

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

socket.on("teamlist", function(_teamList) {
  teamList = _teamList;
});

socket.on("newteam", function(teamData) {
  teamList.add(teamData);
  Materialize.toast("New team added!");
});
