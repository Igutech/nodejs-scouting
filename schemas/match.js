'use strict';
var mongoose = require('mongoose')
var Schema = mongoose.Schema;

var MatchSchema = new Schema({
  number: Number,
  field: Number,
  scores: Object,
  teams: Object
});

module.exports = mongoose.model('Matches', MatchSchema);
