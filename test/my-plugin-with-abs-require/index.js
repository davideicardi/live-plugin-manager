
const path = require("path");

exports.myVariableFromAbsoluteFile = require(path.join(__dirname, "subFolder", "b"));
