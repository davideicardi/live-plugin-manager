


exports.myGlobals = {
  __dirname,
  __filename
};

exports.myVariable = "value1";
module.exports.myVariable2 = "value2";
exports.myVariableFromSubFile = require("./subFolder/b.js");
exports.myVariableFromSubFolder = require("./subFolder");

// try to load the same module in different ways
let myVariableDifferentStyleOfRequire = require("./subFolder2");
myVariableDifferentStyleOfRequire += require("./subFolder2/index")
myVariableDifferentStyleOfRequire += require("./subFolder2/index.js")
exports.myVariableDifferentStyleOfRequire = myVariableDifferentStyleOfRequire;
