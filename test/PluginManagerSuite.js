"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const path = require("path");
const fs = require("fs-extra");
const os = require("os");
const index_1 = require("../index");
const pluginsPath = path.join(__dirname, "plugins");
describe("PluginManager suite", function () {
    this.timeout(15000);
    this.slow(3000);
    let manager;
    beforeEach(function () {
        return __awaiter(this, void 0, void 0, function* () {
            fs.removeSync(pluginsPath);
            manager = new index_1.PluginManager({
                pluginsPath
            });
        });
    });
    afterEach(function () {
        return __awaiter(this, void 0, void 0, function* () {
            fs.removeSync(pluginsPath);
        });
    });
    it("should not have any installed plugins", function () {
        return __awaiter(this, void 0, void 0, function* () {
            const plugins = yield manager.list();
            chai_1.assert.equal(plugins.length, 0);
        });
    });
    it("installing a plugin from path", function () {
        return __awaiter(this, void 0, void 0, function* () {
            const pluginPath = path.join(__dirname, "my-basic-plugin");
            const pluginInfo = yield manager.installFromPath(pluginPath);
            const pluginInstance = manager.require("my-basic-plugin");
            chai_1.assert.isDefined(pluginInstance, "Plugin is not loaded");
            chai_1.assert.equal(pluginInstance.myVariable, "value1");
        });
    });
    it("installing a plugin with just required info", function () {
        return __awaiter(this, void 0, void 0, function* () {
            const pluginPath = path.join(__dirname, "my-minimal-plugin");
            const pluginInfo = yield manager.installFromPath(pluginPath);
            const pluginInstance = manager.require("my-minimal-plugin");
            chai_1.assert.isDefined(pluginInstance, "Plugin is not loaded");
            chai_1.assert.equal(pluginInstance.myVariable, "value1");
        });
    });
    it("installing a not existing plugin using npm", function () {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const pluginInfo = yield manager.installFromNpm("this-does-not-exists", "9.9.9");
            }
            catch (e) {
                return;
            }
            throw new Error("Expected to fail");
        });
    });
    it("installing a plugin using npm", function () {
        return __awaiter(this, void 0, void 0, function* () {
            const pluginInfo = yield manager.installFromNpm("lodash", "4.17.4");
            const _ = manager.require("lodash");
            chai_1.assert.isDefined(_, "Plugin is not loaded");
            // try to use the plugin
            const result = _.defaults({ a: 1 }, { a: 3, b: 2 });
            chai_1.assert.equal(result.a, 1);
            chai_1.assert.equal(result.b, 2);
        });
    });
    describe("dynamic script", function () {
        it("simple script", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const code = `
			const a = 1;
			const b = 3;

			module.exports = a + b;
			`;
                const result = manager.runScript(code);
                chai_1.assert.equal(result, 4);
            });
        });
        it("script with comment at the end", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const code = `
			const a = 1;
			const b = 3;

			module.exports = a + b;
			// some content`;
                const result = manager.runScript(code);
                chai_1.assert.equal(result, 4);
            });
        });
        it("require system module", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const code = `
			const os = require("os");

			module.exports = os.hostname();
			`;
                const result = manager.runScript(code);
                chai_1.assert.equal(result, os.hostname());
            });
        });
    });
    describe("installing a plugin", function () {
        let pluginInfo;
        beforeEach(function () {
            return __awaiter(this, void 0, void 0, function* () {
                pluginInfo = yield manager.installFromNpm("lodash", "4.17.4");
            });
        });
        it("should be available", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const plugins = yield manager.list();
                chai_1.assert.equal(plugins.length, 1);
                chai_1.assert.equal(plugins[0].name, "lodash");
                chai_1.assert.equal(plugins[0].version, "4.17.4");
                chai_1.assert.equal(plugins[0].location, path.join(pluginsPath, "lodash"));
                chai_1.assert.isTrue(fs.existsSync(pluginInfo.location));
                const _ = manager.require("lodash");
                chai_1.assert.isDefined(_, "Plugin is not loaded");
                chai_1.assert.equal(manager.getInfo("lodash"), pluginInfo);
            });
        });
        it("require always return the same instance", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const instance1 = manager.require("lodash");
                const instance2 = manager.require("lodash");
                chai_1.assert.equal(instance1, instance2);
            });
        });
        it("dynamic script can require a plugin", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const code = `
			const _ = require("lodash");

			module.exports = _;
			`;
                const result = manager.runScript(code);
                const instance = manager.require("lodash");
                chai_1.assert.equal(instance, result);
            });
        });
        describe("uninstalling", function () {
            beforeEach(function () {
                return __awaiter(this, void 0, void 0, function* () {
                    yield manager.uninstall("lodash");
                });
            });
            it("should not be available anymore", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    const plugins = yield manager.list();
                    chai_1.assert.equal(plugins.length, 0);
                    chai_1.assert.isFalse(fs.existsSync(pluginInfo.location), "Directory still exits");
                    try {
                        manager.require("lodash");
                    }
                    catch (e) {
                        return;
                    }
                    throw new Error("Expected to fail");
                });
            });
            it("requiring a not installed plugin", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        require("lodash");
                    }
                    catch (e) {
                        return;
                    }
                    throw new Error("Expected to fail");
                });
            });
            it("requiring a not installed plugin using it's path", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    // Ensure that the plugin is really unloaded
                    try {
                        require(pluginInfo.location);
                    }
                    catch (e) {
                        return;
                    }
                    throw new Error("Expected to fail");
                });
            });
        });
    });
    it("plugins respect the same node.js behavior", function () {
        return __awaiter(this, void 0, void 0, function* () {
            const pluginSourcePath = path.join(__dirname, "my-test-plugin");
            const pluginInfo = yield manager.installFromPath(pluginSourcePath);
            const pluginInstance = manager.require("my-test-plugin");
            chai_1.assert.isDefined(pluginInstance, "Plugin is not loaded");
            chai_1.assert.equal(pluginInstance.myVariable, "value1");
            chai_1.assert.equal(pluginInstance.myVariable2, "value2");
            chai_1.assert.equal(pluginInstance.myVariableFromSubFile, "value3");
            chai_1.assert.equal(pluginInstance.myVariableFromSubFolder, "value4");
            chai_1.assert.equal(pluginInstance.myVariableDifferentStyleOfRequire, "value5");
            chai_1.assert.equal(pluginInstance.myJsonRequire.loaded, "yes");
            chai_1.assert.equal(pluginInstance.myGlobals.__filename, path.join(pluginsPath, "my-test-plugin", "index.js"));
            chai_1.assert.equal(pluginInstance.myGlobals.__dirname, path.join(pluginsPath, "my-test-plugin"));
            chai_1.assert.equal(pluginInstance.myGlobals.process, process);
            chai_1.assert.equal(pluginInstance.myGlobals.console, console);
            chai_1.assert.equal(pluginInstance.myGlobals.clearImmediate, clearImmediate);
            chai_1.assert.equal(pluginInstance.myGlobals.clearInterval, clearInterval);
            chai_1.assert.equal(pluginInstance.myGlobals.clearTimeout, clearTimeout);
            chai_1.assert.equal(pluginInstance.myGlobals.setImmediate, setImmediate);
            chai_1.assert.equal(pluginInstance.myGlobals.setInterval, setInterval);
            chai_1.assert.equal(pluginInstance.myGlobals.setTimeout, setTimeout);
            chai_1.assert.equal(pluginInstance.myGlobals.Buffer, Buffer);
        });
    });
    describe("plugins dependencies", function () {
        it("dependencies are installed", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const pluginSourcePath = path.join(__dirname, "my-plugin-with-dep");
                const pluginInfo = yield manager.installFromPath(pluginSourcePath);
                chai_1.assert.equal(manager.list()[0].name, "moment");
                chai_1.assert.equal(manager.list()[1].name, "my-plugin-with-dep");
                const pluginInstance = manager.require("my-plugin-with-dep");
                chai_1.assert.equal(pluginInstance, "1981/10/06");
            });
        });
        it("ignored dependencies are not installed (@types)", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const pluginSourcePath = path.join(__dirname, "my-plugin-with-dep");
                const pluginInfo = yield manager.installFromPath(pluginSourcePath);
                chai_1.assert.equal(manager.list().length, 2);
                chai_1.assert.equal(manager.list()[0].name, "moment");
                chai_1.assert.equal(manager.list()[1].name, "my-plugin-with-dep");
            });
        });
    });
    describe("npm registry", function () {
        it("get latest version info", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const info = yield manager.getInfoFromNpm("lodash");
                chai_1.assert.equal("lodash", info.name);
                chai_1.assert.isDefined(info.version);
            });
        });
        it("get specific verison info", function () {
            return __awaiter(this, void 0, void 0, function* () {
                let info = yield manager.getInfoFromNpm("lodash", "4.17.4");
                chai_1.assert.equal("lodash", info.name);
                chai_1.assert.equal("4.17.4", info.version);
                info = yield manager.getInfoFromNpm("lodash", "=4.17.4");
                chai_1.assert.equal("lodash", info.name);
                chai_1.assert.equal("4.17.4", info.version);
            });
        });
        it("get caret verison range info", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const info = yield manager.getInfoFromNpm("lodash", "^3.0.0");
                chai_1.assert.equal("lodash", info.name);
                chai_1.assert.equal("3.10.1", info.version); // this test can fail if lodash publish a 3.x version
            });
        });
        it("get latest version info for scoped packages", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const info = yield manager.getInfoFromNpm("@types/node");
                chai_1.assert.equal("@types/node", info.name);
                chai_1.assert.isDefined(info.version);
            });
        });
        it("get specific version info for scoped packages", function () {
            return __awaiter(this, void 0, void 0, function* () {
                let info = yield manager.getInfoFromNpm("@types/node", "7.0.13");
                chai_1.assert.equal("@types/node", info.name);
                chai_1.assert.equal("7.0.13", info.version);
                info = yield manager.getInfoFromNpm("@types/node", "=7.0.13");
                chai_1.assert.equal("@types/node", info.name);
                chai_1.assert.equal("7.0.13", info.version);
            });
        });
        it("get caret verison range info for scoped packages", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const info = yield manager.getInfoFromNpm("@types/node", "^6.0.0");
                chai_1.assert.equal("@types/node", info.name);
                chai_1.assert.equal("6.0.70", info.version); // this test can fail if @types/node publish a 6.x version
            });
        });
    });
});
//# sourceMappingURL=PluginManagerSuite.js.map