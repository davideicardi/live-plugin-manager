"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../index");
const path = require("path");
const manager = new index_1.PluginManager({
    pluginsDirectory: path.join(__dirname, ".plugins")
});
manager.install("https://registry.npmjs.org/forge-nodejs-sdk/-/forge-nodejs-sdk-4.3.1.tgz");
//# sourceMappingURL=index.js.map