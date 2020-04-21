const request = require("request");
const cheerio = require("cheerio");
const url = 'http://www.ftcpenn.org/ftc-events/2019-2020-season/maroon-and-white-qualifier/match-results-details'

class Match {
    constructor(match_number, field, blue_score, blue_penalty, blue_auto, blue_tele, blue_end, red_score, red_penalty,
        red_auto, red_tele, red_end, redTeam_one, redTeam_two, blueTeam_one, blueTeam_two) {
        this.number = Number(match_number);
        this.field = Number(field);
        this.blue_score = Number(blue_score);
        this.blue_penalty = Number(blue_penalty);
        this.blue_auto = Number(blue_auto);
        this.blue_tele = Number(blue_tele);
        this.blue_end = Number(blue_end);
        this.red_score = Number(red_score);
        this.red_penalty = Number(red_penalty);
        this.red_auto = Number(red_auto);
        this.red_tele = Number(red_tele);
        this.red_end = Number(red_end);
        this.redTeam_one = Number(redTeam_one);
        this.redTeam_two = Number(redTeam_two);
        this.blueTeam_one = Number(blueTeam_one);
        this.blueTeam_two = Number(blueTeam_two);
    }
}

function getList() {
    return new Promise((resolve, reject) => {
        var list = [];
        var matches = [];
        var filtered = [];
        request(url, (error, response, html) => {
            if (error) {
                reject(error);
                return
            }
            if (response.statusCode == 200) {
                var $ = cheerio.load(html);
                var tbody = $('#sites-canvas-main-content').closest('tbody')

                var row = $(tbody).find("tr");
                $(row).each((index, element) => {
                    var cols = $(element).find("td");
                    $(cols).each((i, el) => {
                        list.push($(el).text());
                    })
                })

            }
            list.splice(0, 3);
            for (var i = 0; i < list.length; i += 16) {
                matches.push(list.slice(i, i + 16));

            }


            for (var i = 0; i < matches.length; i++) {
                if (!matches[i][0].startsWith("Q")) {
                    matches.splice(i, matches.length);
                }
            }
            for (var i = 0; i < matches.length; i++) {
                //ALWAYS RED THEN BLUE
                var match_number = matches[i][0].split("-")[1];
                if (match_number % 2 == 0) {
                    var field = 2
                } else {
                    field = 1;
                }
                var redTeam_one = matches[i][2].split(" ")[0]

                var redTeam_two = matches[i][2].split(" ")[1]

                var blueTeam_one = matches[i][3].split(" ")[0]

                var blueTeam_two = matches[i][3].split(" ")[1]

                var red_total = matches[i][4];
                var red_auto = matches[i][5];
                var red_tele = matches[i][7];
                var red_end = matches[i][8]
                var red_penalty = matches[i][9]

                var blue_total = matches[i][10]
                var blue_auto = matches[i][11]
                var blue_tele = matches[i][13]
                var blue_end = matches[i][14]
                var blue_penalty = matches[i][15]
                var match = new Match(match_number, field, blue_total, blue_penalty, blue_auto, blue_tele, blue_end,
                    red_total, red_penalty, red_auto, red_tele, red_end, redTeam_one, redTeam_two, blueTeam_one, blueTeam_two);
                filtered.push(match);

            }
            resolve(filtered);
        })
    })

}

module.exports = getList