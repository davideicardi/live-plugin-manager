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
            chai_1.assert.equal(pluginInstance.myGlobals.__filename, path.join(pluginsPath, "my-test-plugin", "index.js"));
            chai_1.assert.equal(pluginInstance.myGlobals.__dirname, path.join(pluginsPath, "my-test-plugin"));
        });
    });
});
//# sourceMappingURL=PluginManagerSuite.js.map