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
describe("PluginManager suite", function () {
    this.timeout(15000);
    this.slow(3000);
    let manager;
    beforeEach(function () {
        return __awaiter(this, void 0, void 0, function* () {
            manager = new index_1.PluginManager();
            // sanity check to see if the pluginsPath is what we expect to be
            if (manager.options.pluginsPath !== path.join(__dirname, "../plugin_packages")) {
                throw new Error("Invalid plugins path " + manager.options.pluginsPath);
            }
            fs.removeSync(manager.options.pluginsPath);
        });
    });
    afterEach(function () {
        return __awaiter(this, void 0, void 0, function* () {
            fs.removeSync(manager.options.pluginsPath);
        });
    });
    describe("installation", function () {
        it("initially should not have any plugins", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const plugins = yield manager.list();
                chai_1.assert.equal(plugins.length, 0);
                chai_1.assert.isUndefined(manager.alreadyInstalled("moment"));
                chai_1.assert.isUndefined(manager.alreadyInstalled("my-basic-plugin"));
            });
        });
        describe("from path", function () {
            it("installing a not existing plugin", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        const pluginInfo = yield manager.installFromPath("/this/path/does-not-exists");
                    }
                    catch (e) {
                        return;
                    }
                    throw new Error("Expected to fail");
                });
            });
            it("installing a plugin", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    const pluginPath = path.join(__dirname, "my-basic-plugin");
                    const pluginInfo = yield manager.installFromPath(pluginPath);
                    const pluginInstance = manager.require("my-basic-plugin");
                    chai_1.assert.isDefined(pluginInstance, "Plugin is not loaded");
                    chai_1.assert.equal(pluginInstance.myVariable, "value1");
                });
            });
            it("installing a plugin 2 times doesn't have effect", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    const pluginPath = path.join(__dirname, "my-basic-plugin");
                    yield manager.installFromPath(pluginPath);
                    const pluginInstance = manager.require("my-basic-plugin");
                    yield manager.installFromPath(pluginPath);
                    const pluginInstance2 = manager.require("my-basic-plugin");
                    chai_1.assert.equal(pluginInstance, pluginInstance2);
                    chai_1.assert.equal(pluginInstance.installDate, pluginInstance2.installDate);
                });
            });
            it("installing a plugin 2 times with force options allow to force a reinstallation", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    const pluginPath = path.join(__dirname, "my-basic-plugin");
                    yield manager.installFromPath(pluginPath);
                    const pluginInstance = manager.require("my-basic-plugin");
                    yield manager.installFromPath(pluginPath, { force: true });
                    const pluginInstance2 = manager.require("my-basic-plugin");
                    chai_1.assert.notEqual(pluginInstance, pluginInstance2);
                    chai_1.assert.notEqual(pluginInstance.installDate, pluginInstance2.installDate);
                });
            });
            it("installing a plugin with minimal info", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    const pluginPath = path.join(__dirname, "my-minimal-plugin");
                    const pluginInfo = yield manager.installFromPath(pluginPath);
                    const pluginInstance = manager.require("my-minimal-plugin");
                    chai_1.assert.isDefined(pluginInstance, "Plugin is not loaded");
                    chai_1.assert.equal(pluginInstance.myVariable, "value1");
                });
            });
        });
        describe("from npm", function () {
            it("installing a not existing plugin", function () {
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
            it("installing a plugin", function () {
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
        });
        describe("from code", function () {
            for (const invalidName of ["../test", ".\\test", "", undefined, null]) {
                it(`installing a not valid plugin name "${invalidName}" is not supported`, function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        try {
                            const n = invalidName;
                            const pluginInfo = yield manager.installFromNpm(n, "9.9.9");
                        }
                        catch (e) {
                            return;
                        }
                        throw new Error("Expected to fail");
                    });
                });
            }
            it("installing a plugin", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    const code = `module.exports = "Hello from code plugin";`;
                    yield manager.installFromCode("my-code-plugin", code);
                    const myPlugin = manager.require("my-code-plugin");
                    chai_1.assert.isDefined(myPlugin, "Plugin is not loaded");
                    // try to use the plugin
                    chai_1.assert.equal(myPlugin, "Hello from code plugin");
                });
            });
            it("update a plugin", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    const code = `module.exports = "Hello from code plugin";`;
                    yield manager.installFromCode("my-code-plugin", code);
                    const myPlugin = manager.require("my-code-plugin");
                    chai_1.assert.equal(myPlugin, "Hello from code plugin");
                    const codeV2 = `module.exports = "V2";`;
                    yield manager.installFromCode("my-code-plugin", codeV2);
                    const myPluginV2 = manager.require("my-code-plugin");
                    chai_1.assert.equal(myPluginV2, "V2");
                });
            });
            it("uninstalling a plugin", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    const code = `module.exports = "Hello from code plugin";`;
                    yield manager.installFromCode("my-code-plugin", code);
                    const myPlugin = manager.require("my-code-plugin");
                    chai_1.assert.equal(myPlugin, "Hello from code plugin");
                    yield manager.uninstall("my-code-plugin");
                    try {
                        manager.require("my-code-plugin");
                    }
                    catch (e) {
                        return;
                    }
                    throw new Error("Expected to fail");
                });
            });
        });
    });
    describe("run script", function () {
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
    describe("given an installed plugin", function () {
        let pluginInfo;
        beforeEach(function () {
            return __awaiter(this, void 0, void 0, function* () {
                pluginInfo = yield manager.installFromNpm("moment", "2.18.1");
            });
        });
        it("alreadyInstalled function should respect semver", function () {
            chai_1.assert.isDefined(manager.alreadyInstalled("moment"));
            chai_1.assert.isDefined(manager.alreadyInstalled("moment", "2.18.1"));
            chai_1.assert.isDefined(manager.alreadyInstalled("moment", "v2.18.1"));
            chai_1.assert.isDefined(manager.alreadyInstalled("moment", "=2.18.1"));
            chai_1.assert.isDefined(manager.alreadyInstalled("moment", ">=2.18.1"));
            chai_1.assert.isDefined(manager.alreadyInstalled("moment", "^2.18.1"));
            chai_1.assert.isDefined(manager.alreadyInstalled("moment", "^2.0.0"));
            chai_1.assert.isDefined(manager.alreadyInstalled("moment", ">=1.0.0"));
            chai_1.assert.isUndefined(manager.alreadyInstalled("moment", "2.17.0"));
            chai_1.assert.isUndefined(manager.alreadyInstalled("moment", "2.19.0"));
            chai_1.assert.isUndefined(manager.alreadyInstalled("moment", "3.0.0"));
            chai_1.assert.isUndefined(manager.alreadyInstalled("moment", "=3.0.0"));
            chai_1.assert.isUndefined(manager.alreadyInstalled("moment", "^3.0.0"));
        });
        it("should be available", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const plugins = yield manager.list();
                chai_1.assert.equal(plugins.length, 1);
                chai_1.assert.equal(plugins[0].name, "moment");
                chai_1.assert.equal(plugins[0].version, "2.18.1");
                chai_1.assert.equal(plugins[0].location, path.join(manager.options.pluginsPath, "moment"));
                chai_1.assert.isTrue(fs.existsSync(pluginInfo.location));
                const moment = manager.require("moment");
                chai_1.assert.isDefined(moment, "Plugin is not loaded");
                chai_1.assert.equal(manager.getInfo("moment"), pluginInfo);
            });
        });
        it("require always return the same instance", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const instance1 = manager.require("moment");
                const instance2 = manager.require("moment");
                chai_1.assert.equal(instance1, instance2);
            });
        });
        it("dynamic script can require a plugin", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const code = `
			const m = require("moment");

			module.exports = m;
			`;
                const result = manager.runScript(code);
                const expectedInstance = manager.require("moment");
                chai_1.assert.equal(expectedInstance, result);
            });
        });
        it("code plugin can require another plugin", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const code = `
			const m = require("moment");

			module.exports = m;
			`;
                yield manager.installFromCode("myplugin", code);
                const result = manager.require("myplugin");
                const expectedInstance = manager.require("moment");
                chai_1.assert.equal(expectedInstance, result);
            });
        });
        describe("when uninstalled", function () {
            beforeEach(function () {
                return __awaiter(this, void 0, void 0, function* () {
                    yield manager.uninstall("moment");
                });
            });
            it("should not be available anymore", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    const plugins = yield manager.list();
                    chai_1.assert.equal(plugins.length, 0);
                    chai_1.assert.isFalse(fs.existsSync(pluginInfo.location), "Directory still exits");
                });
            });
            it("requiring a not installed plugin throw an error", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        manager.require("moment");
                    }
                    catch (e) {
                        return;
                    }
                    throw new Error("Expected to fail");
                });
            });
            it("directly requiring a not installed plugin throw an error", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        require("moment");
                    }
                    catch (e) {
                        return;
                    }
                    throw new Error("Expected to fail");
                });
            });
            it("requiring a not installed plugin using it's path throw an error", function () {
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
    describe("require", function () {
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
                chai_1.assert.equal(pluginInstance.myGlobals.__filename, path.join(manager.options.pluginsPath, "my-test-plugin", "index.js"));
                chai_1.assert.equal(pluginInstance.myGlobals.__dirname, path.join(manager.options.pluginsPath, "my-test-plugin"));
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
    });
    describe("plugins dependencies", function () {
        it("dependencies are installed", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const pluginSourcePath = path.join(__dirname, "my-plugin-with-dep");
                const pluginInfo = yield manager.installFromPath(pluginSourcePath);
                chai_1.assert.equal(manager.list().length, 2);
                chai_1.assert.equal(manager.list()[0].name, "moment");
                chai_1.assert.equal(manager.list()[1].name, "my-plugin-with-dep");
            });
        });
        it("dependencies are available", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const pluginSourcePath = path.join(__dirname, "my-plugin-with-dep");
                const pluginInfo = yield manager.installFromPath(pluginSourcePath);
                const pluginInstance = manager.require("my-plugin-with-dep");
                chai_1.assert.equal(pluginInstance.testMoment, "1981/10/06");
            });
        });
        it("by default @types dependencies are not installed", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const pluginSourcePath = path.join(__dirname, "my-plugin-with-dep");
                const pluginInfo = yield manager.installFromPath(pluginSourcePath);
                for (const p of manager.list()) {
                    chai_1.assert.notEqual(p.name, "@types/express");
                }
            });
        });
        it("dependencies installed in the host are not installed but are available", function () {
            return __awaiter(this, void 0, void 0, function* () {
                // debug package is already available in the host
                const pluginSourcePath = path.join(__dirname, "my-plugin-with-dep");
                const pluginInfo = yield manager.installFromPath(pluginSourcePath);
                for (const p of manager.list()) {
                    chai_1.assert.notEqual(p.name, "debug");
                }
            });
        });
        describe("Given some ignored dependencies", function () {
            beforeEach(function () {
                manager.options.ignoredDependencies = [/^@types\//, "moment"];
            });
            it("ignored dependencies are not installed", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    const pluginSourcePath = path.join(__dirname, "my-plugin-with-dep");
                    const pluginInfo = yield manager.installFromPath(pluginSourcePath);
                    for (const p of manager.list()) {
                        chai_1.assert.notEqual(p.name, "moment");
                    }
                });
            });
            it("if the ignored dependencies is required the plugin will not be loaded", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    const pluginSourcePath = path.join(__dirname, "my-plugin-with-dep");
                    const pluginInfo = yield manager.installFromPath(pluginSourcePath);
                    // expected to fail because moment is missing...
                    try {
                        const pluginInstance = manager.require("my-plugin-with-dep");
                    }
                    catch (err) {
                        chai_1.assert.equal(err.message, "Cannot find module 'moment'");
                        return;
                    }
                    throw new Error("Expected to fail");
                });
            });
        });
        describe("handling updates", function () {
            beforeEach(function () {
                return __awaiter(this, void 0, void 0, function* () {
                    yield manager.installFromPath(path.join(__dirname, "my-plugin-a@v1"));
                    yield manager.installFromPath(path.join(__dirname, "my-plugin-b")); // depend on my-plugin-a@1.0.0
                });
            });
            it("updating a dependency will reload dependents", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    // load the plugin before installing the new version
                    //  to ensure that the starting condition is valid
                    chai_1.assert.equal(manager.list().length, 2);
                    chai_1.assert.equal(manager.list()[0].name, "my-plugin-a");
                    chai_1.assert.equal(manager.list()[0].version, "1.0.0");
                    chai_1.assert.equal(manager.list()[1].name, "my-plugin-b");
                    const initialPluginInstance = manager.require("my-plugin-b");
                    chai_1.assert.equal(initialPluginInstance, "a = v1");
                    yield manager.installFromPath(path.join(__dirname, "my-plugin-a@v2"));
                    chai_1.assert.equal(manager.list().length, 2);
                    chai_1.assert.isDefined(manager.alreadyInstalled("my-plugin-b", "=1.0.0"));
                    chai_1.assert.isDefined(manager.alreadyInstalled("my-plugin-a", "=2.0.0"));
                    const pluginInstance = manager.require("my-plugin-b");
                    chai_1.assert.equal(pluginInstance, "a = v2");
                });
            });
        });
        describe("given a static dependencies", function () {
            beforeEach(function () {
                const momentStub = () => {
                    return {
                        format: () => "this is moment stub"
                    };
                };
                manager.options.staticDependencies = { moment: momentStub };
            });
            it("static dependencies are not installed but resolved correctly", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    const pluginSourcePath = path.join(__dirname, "my-plugin-with-dep");
                    const pluginInfo = yield manager.installFromPath(pluginSourcePath);
                    chai_1.assert.equal(manager.list().length, 1);
                    chai_1.assert.equal(manager.list()[0].name, "my-plugin-with-dep");
                    const pluginInstance = manager.require("my-plugin-with-dep");
                    chai_1.assert.equal(pluginInstance.testMoment, "this is moment stub");
                });
            });
        });
    });
    describe("npm registry info", function () {
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
        it("get caret version range info for scoped packages", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const info = yield manager.getInfoFromNpm("@types/node", "^6.0.0");
                chai_1.assert.equal("@types/node", info.name);
                chai_1.assert.equal("6.0.88", info.version); // this test can fail if @types/node publish a 6.x version
            });
        });
    });
});
//# sourceMappingURL=PluginManagerSuite.js.map