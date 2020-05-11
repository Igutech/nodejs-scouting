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
    end_foundation: $("#end_foundation")[0].checked,
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