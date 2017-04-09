


exports.myGlobals = {
  __dirname,
  __filename,
  process,
  Buffer,
  console,

  clearImmediate,
  clearInterval,
  clearTimeout,
  setImmediate,
  setInterval,
  setTimeout
};

exports.myVariable = "value1";
module.exports.myVariable2 = "value2";
exports.myVariableFromSubFile = require("./subFolder/b.js");
exports.myVariableFromSubFolder = require("./subFolder");
exports.myJsonRequire = require("./aJsonFile.json");

// try to load the same module in different ways
const myVariableDifferentStyleOfRequire = require("./subFolder2");
const myVariableDifferentStyleOfRequire2 = require("./subFolder2/index")
const myVariableDifferentStyleOfRequire3 = require("./subFolder2/index.js")
if (myVariableDifferentStyleOfRequire != myVariableDifferentStyleOfRequire2
  || myVariableDifferentStyleOfRequire != myVariableDifferentStyleOfRequire3) {
  throw new Error("Unexpected require value");
}
exports.myVariableDifferentStyleOfRequire = myVariableDifferentStyleOfRequire;
