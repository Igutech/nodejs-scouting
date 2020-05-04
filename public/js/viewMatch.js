var socket = io();

$("#matchScrape").click(function () {

  socket.emit("button", "matchScrape");

});

socket.on("matchlist", function (_matchList) {
  matchList = _matchList;
  $("#match_list").empty();
  matchList.forEach(function (match) {
    $("#match_list").append(getMatchTableRow(match));
  });
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

