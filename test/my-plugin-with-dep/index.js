"use strict";

const moment = require("moment");
const _ = require("underscore");
const debug = require("debug");

exports.testMoment = moment("19811006", "YYYYMMDD").format("YYYY/MM/DD");
exports.testDebug = debug;

exports.testUnderscore = _.template("hello <%= name %>!")({ name: "underscore" });
