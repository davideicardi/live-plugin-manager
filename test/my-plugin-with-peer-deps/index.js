"use strict";

const moment = require("moment");
const validator = require("validator");

exports.testMoment = moment("19811006", "YYYYMMDD").format("YYYY/MM/DD");
exports.testValidator = validator;
