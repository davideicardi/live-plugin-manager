
// this is to test that global and env variables are shared between modules
// in the same plugin

process.env.HELLO_VAR = "Hello";
global.WORLD_VAR = "world";
global.EXCLAMATION_VAR = "!";

module.exports = require("./module2");