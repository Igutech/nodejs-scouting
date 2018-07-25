'use strict';
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var TeamSchema = new Schema({
  number: Number,
  name: String,
  data: Object,
  opr: Object
});

module.exports = mongoose.model('Teams', TeamSchema);
