"use strict";

const _ = require("underscore");

exports.testUnderscore = _.template("hello <%= name %>!")({ name: "underscore" });
