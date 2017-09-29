"use strict";

const moment = require("moment");
const debug = require("debug");

exports.testMoment = moment("19811006", "YYYYMMDD").format("YYYY/MM/DD");
exports.testDebug = debug;
