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

socket.on("addteam", function (msg) {
  if (msg === "success") {
    Materialize.toast("Successfully added team!");
  } else {
    Materialize.toast("Error adding team!");
  }
});








