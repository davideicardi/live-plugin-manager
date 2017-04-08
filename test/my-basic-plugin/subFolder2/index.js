
// this is to ensure that the require load the file just one time
global.subFolder2Loaded = global.subFolder2Loaded || 0;
global.subFolder2Loaded += 1;

if (global.subFolder2Loaded !== 1) {
  throw new Error("Loaded too many times");
}

module.exports = "value5";