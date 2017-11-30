
// env and globals are taken from index file
//  try to read global using globa. or directly
module.exports = process.env.HELLO_VAR + " " + global.WORLD_VAR + EXCLAMATION_VAR;
