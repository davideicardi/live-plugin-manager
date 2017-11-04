"use strict";

// I expect this debug reference to be diff than the host "debug" module
// because in the host I have version 3, here I have version 2
const debug = require("debug");

exports.testDebug = debug;
