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
const chai_1 = require("chai"); // tslint:disable-line:no-implicit-dependencies
const path = require("path");
const fs = require("fs-extra");
const os = require("os");
const index_1 = require("../index");
describe("PluginManager:", function () {
    this.timeout(15000);
    this.slow(3000);
    let manager;
    beforeEach(function () {
        return __awaiter(this, void 0, void 0, function* () {
            manager = new index_1.PluginManager({
                githubAuthentication: getGithubAuth()
            });
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
                chai_1.assert.isUndefined(manager.alreadyInstalled("lodash"));
                chai_1.assert.isUndefined(manager.alreadyInstalled("moment"));
                chai_1.assert.isUndefined(manager.alreadyInstalled("my-basic-plugin"));
            });
        });
        it("initially cannot require any plugins", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const isAvaialable = (name) => {
                    try {
                        manager.require(name);
                        return true;
                    }
                    catch (e) {
                        try {
                            require(name);
                            return true;
                        }
                        catch (e) {
                            return false;
                        }
                    }
                };
                chai_1.assert.isFalse(isAvaialable("lodash"));
                chai_1.assert.isFalse(isAvaialable("moment"));
                chai_1.assert.isFalse(isAvaialable("my-basic-plugin"));
            });
        });
        describe("from path", function () {
            it("installing a not existing plugin", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        yield manager.installFromPath("/this/path/does-not-exists");
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
                    yield manager.installFromPath(pluginPath);
                    const pluginInstance = manager.require("my-basic-plugin");
                    chai_1.assert.isDefined(pluginInstance, "Plugin is not loaded");
                    chai_1.assert.equal(pluginInstance.myVariable, "value1");
                });
            });
            it("installing a plugin with a special name", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    // name with dot (.)
                    const pluginPath = path.join(__dirname, "my-plugin.js");
                    yield manager.installFromPath(pluginPath);
                    const pluginInstance = manager.require("my-plugin.js");
                    chai_1.assert.isDefined(pluginInstance, "my-plugin.js!");
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
                    yield manager.installFromPath(pluginPath);
                    const pluginInstance = manager.require("my-minimal-plugin");
                    chai_1.assert.isDefined(pluginInstance, "Plugin is not loaded");
                    chai_1.assert.equal(pluginInstance.myVariable, "value1");
                });
            });
            it("installing a plugin with node_modules should not copy node_modules", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    const pluginPath = path.join(__dirname, "my-plugin-with-npm-modules");
                    yield manager.installFromPath(pluginPath);
                    const pluginInstance = manager.require("my-plugin-with-npm-modules");
                    chai_1.assert.isDefined(pluginInstance, "Plugin is not loaded");
                    chai_1.assert.equal(pluginInstance.myVariable, "value1");
                    const pluginDestinationPath = path.join(manager.options.pluginsPath, "my-plugin-with-npm-modules");
                    chai_1.assert.isTrue(fs.existsSync(pluginDestinationPath), "Plugin directory should be copied");
                    chai_1.assert.isFalse(fs.existsSync(path.join(pluginDestinationPath, "node_modules")), "Directory node_modules should not be copied");
                });
            });
        });
        describe("from npm", function () {
            it("installing a not existing plugin", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        yield manager.installFromNpm("this-does-not-exists", "9.9.9");
                    }
                    catch (e) {
                        return;
                    }
                    throw new Error("Expected to fail");
                });
            });
            it("installing a plugin (lodash)", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    yield manager.installFromNpm("lodash", "4.17.4");
                    const _ = manager.require("lodash");
                    chai_1.assert.isDefined(_, "Plugin is not loaded");
                    // try to use the plugin
                    const result = _.defaults({ a: 1 }, { a: 3, b: 2 });
                    chai_1.assert.equal(result.a, 1);
                    chai_1.assert.equal(result.b, 2);
                });
            });
        });
        describe("from github", function () {
            this.slow(4000);
            it("api configuration", function () {
                if (!manager.options.githubAuthentication) {
                    // tslint:disable-next-line:no-console
                    console.error("WARNING: No github_auth.json found, github api can give rate limits errors");
                }
            });
            it("installing a not existing plugin", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        yield manager.installFromGithub("this/doesnotexists");
                    }
                    catch (e) {
                        return;
                    }
                    throw new Error("Expected to fail");
                });
            });
            // NOTE: Initially I have tried with lodash but it doesn't have a valid structure
            // (missing lodash.js, probably need a compilation)
            it("installing a plugin from master branch (underscore)", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    yield manager.installFromGithub("jashkenas/underscore");
                    const _ = manager.require("underscore");
                    chai_1.assert.isDefined(_, "Plugin is not loaded");
                    // try to use the plugin
                    const result = _.defaults({ a: 1 }, { a: 3, b: 2 });
                    chai_1.assert.equal(result.a, 1);
                    chai_1.assert.equal(result.b, 2);
                });
            });
            it("installing a plugin from commit (underscore)", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    const pluginInfo = yield manager.installFromGithub("jashkenas/underscore#1aed9ec");
                    chai_1.assert.equal(pluginInfo.version, "1.8.0");
                    const _ = manager.require("underscore");
                    chai_1.assert.isDefined(_, "Plugin is not loaded");
                    // try to use the plugin
                    const result = _.defaults({ a: 1 }, { a: 3, b: 2 });
                    chai_1.assert.equal(result.a, 1);
                    chai_1.assert.equal(result.b, 2);
                });
            });
            it("installing a plugin from tag (underscore)", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    const pluginInfo = yield manager.installFromGithub("jashkenas/underscore#1.8.0");
                    chai_1.assert.equal(pluginInfo.version, "1.8.0");
                    const _ = manager.require("underscore");
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
                            yield manager.installFromNpm(n, "9.9.9");
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
                        require("moment"); // tslint:disable-line:no-implicit-dependencies
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
    describe("given a plugin x that depend on y", function () {
        describe("when plugin y is installed", function () {
            beforeEach(function () {
                return __awaiter(this, void 0, void 0, function* () {
                    yield manager.installFromPath(path.join(__dirname, "my-plugin-y"));
                });
            });
            it("when plugin x is installed can require plugin y", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    yield manager.installFromPath(path.join(__dirname, "my-plugin-x"));
                    const x = manager.require("my-plugin-x");
                    chai_1.assert.equal(x.y, "y!");
                });
            });
            it("when plugin x is installed can require plugin y sub file", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    yield manager.installFromPath(path.join(__dirname, "my-plugin-x"));
                    const x = manager.require("my-plugin-x");
                    chai_1.assert.equal(x.y_subFile, "y_subFile!");
                });
            });
        });
    });
    describe("require", function () {
        it("plugins respect the same node.js behavior", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const pluginSourcePath = path.join(__dirname, "my-test-plugin");
                yield manager.installFromPath(pluginSourcePath);
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
        it("requre a plugin sub folder", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const pluginSourcePath = path.join(__dirname, "my-test-plugin");
                yield manager.installFromPath(pluginSourcePath);
                const result = manager.require("my-test-plugin/subFolder");
                chai_1.assert.isDefined(result, "value4");
            });
        });
        it("requre a plugin sub file", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const pluginSourcePath = path.join(__dirname, "my-test-plugin");
                yield manager.installFromPath(pluginSourcePath);
                const result = manager.require("my-test-plugin/subFolder/b");
                chai_1.assert.isDefined(result, "value3");
            });
        });
        it("index file can be required explicitly or implicitly", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const pluginSourcePath = path.join(__dirname, "my-test-plugin");
                yield manager.installFromPath(pluginSourcePath);
                const resultImplicit = manager.require("my-test-plugin");
                const resultExplicit = manager.require("my-test-plugin/index");
                const resultExplicit2 = manager.require("my-test-plugin/index.js");
                chai_1.assert.equal(resultImplicit, resultExplicit);
                chai_1.assert.equal(resultImplicit, resultExplicit2);
            });
        });
    });
    describe("plugins dependencies", function () {
        this.slow(6000);
        describe("Npm dependencies", function () {
            it("dependencies are installed", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    const pluginSourcePath = path.join(__dirname, "my-plugin-with-dep");
                    yield manager.installFromPath(pluginSourcePath);
                    chai_1.assert.equal(manager.list().length, 2);
                    chai_1.assert.equal(manager.list()[0].name, "moment");
                    chai_1.assert.equal(manager.list()[1].name, "my-plugin-with-dep");
                });
            });
            it("dependencies are available", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    const pluginSourcePath = path.join(__dirname, "my-plugin-with-dep");
                    yield manager.installFromPath(pluginSourcePath);
                    const pluginInstance = manager.require("my-plugin-with-dep");
                    chai_1.assert.equal(pluginInstance.testDebug, require("debug")); // I expect to be exactly the same
                    chai_1.assert.equal(pluginInstance.testMoment, "1981/10/06");
                });
            });
            it("by default @types dependencies are not installed", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    const pluginSourcePath = path.join(__dirname, "my-plugin-with-dep");
                    yield manager.installFromPath(pluginSourcePath);
                    for (const p of manager.list()) {
                        chai_1.assert.notEqual(p.name, "@types/express");
                    }
                });
            });
            it("dependencies installed in the host are not installed but are available", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    // debug package is already available in the host
                    const pluginSourcePath = path.join(__dirname, "my-plugin-with-dep");
                    yield manager.installFromPath(pluginSourcePath);
                    for (const p of manager.list()) {
                        chai_1.assert.notEqual(p.name, "debug");
                    }
                });
            });
        });
        describe("Github dependencies", function () {
            it("dependencies are installed", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    const pluginSourcePath = path.join(__dirname, "my-plugin-with-git-dep");
                    yield manager.installFromPath(pluginSourcePath);
                    chai_1.assert.equal(manager.list().length, 2);
                    chai_1.assert.equal(manager.list()[0].name, "underscore");
                    chai_1.assert.equal(manager.list()[1].name, "my-plugin-with-git-dep");
                });
            });
        });
        describe("Given some ignored dependencies", function () {
            beforeEach(function () {
                manager.options.ignoredDependencies = [/^@types\//, "moment"];
            });
            it("ignored dependencies are not installed", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    const pluginSourcePath = path.join(__dirname, "my-plugin-with-dep");
                    yield manager.installFromPath(pluginSourcePath);
                    for (const p of manager.list()) {
                        chai_1.assert.notEqual(p.name, "moment");
                    }
                });
            });
            it("if the ignored dependencies is required the plugin will not be loaded", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    const pluginSourcePath = path.join(__dirname, "my-plugin-with-dep");
                    yield manager.installFromPath(pluginSourcePath);
                    // expected to fail because moment is missing...
                    try {
                        manager.require("my-plugin-with-dep");
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
        describe("given static dependencies", function () {
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
                    yield manager.installFromPath(pluginSourcePath);
                    chai_1.assert.equal(manager.list().length, 1);
                    chai_1.assert.equal(manager.list()[0].name, "my-plugin-with-dep");
                    const pluginInstance = manager.require("my-plugin-with-dep");
                    chai_1.assert.equal(pluginInstance.testMoment, "this is moment stub");
                });
            });
        });
        describe("Not compatible dependencies", function () {
            it("dependencies are installed", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    const pluginSourcePath = path.join(__dirname, "my-plugin-with-diff-dep");
                    yield manager.installFromPath(pluginSourcePath);
                    chai_1.assert.equal(manager.list().length, 2);
                    chai_1.assert.equal(manager.list()[0].name, "debug");
                    chai_1.assert.equal(manager.list()[1].name, "my-plugin-with-diff-dep");
                });
            });
            it("dependencies are available", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    const pluginSourcePath = path.join(__dirname, "my-plugin-with-diff-dep");
                    yield manager.installFromPath(pluginSourcePath);
                    const pluginInstance = manager.require("my-plugin-with-diff-dep");
                    chai_1.assert.notEqual(pluginInstance.testDebug, require("debug")); // I expect to be different (v2 vs v3)
                });
            });
        });
    });
    describe("query npm package", function () {
        it("get latest version info", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const info = yield manager.queryPackageFromNpm("lodash");
                chai_1.assert.equal("lodash", info.name);
                chai_1.assert.isDefined(info.version);
                chai_1.assert.isDefined(info.main);
            });
        });
        it("get latest version info (with string empty version)", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const info = yield manager.queryPackageFromNpm("lodash", "");
                chai_1.assert.equal("lodash", info.name);
                chai_1.assert.isDefined(info.version);
            });
        });
        it("get specific version info", function () {
            return __awaiter(this, void 0, void 0, function* () {
                let info = yield manager.queryPackageFromNpm("lodash", "4.17.4");
                chai_1.assert.equal(info.name, "lodash");
                chai_1.assert.equal(info.version, "4.17.4");
                info = yield manager.queryPackageFromNpm("lodash", "=4.17.4");
                chai_1.assert.equal(info.name, "lodash");
                chai_1.assert.equal(info.version, "4.17.4");
            });
        });
        it("get caret version range info", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const info = yield manager.queryPackageFromNpm("lodash", "^3.0.0");
                chai_1.assert.equal(info.name, "lodash");
                chai_1.assert.equal(info.version, "3.10.1"); // this test can fail if lodash publish a 3.x version
            });
        });
        it("get latest version info for scoped packages", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const info = yield manager.queryPackageFromNpm("@types/node");
                chai_1.assert.equal("@types/node", info.name);
                chai_1.assert.isDefined(info.version);
            });
        });
        it("get specific version info for scoped packages", function () {
            return __awaiter(this, void 0, void 0, function* () {
                let info = yield manager.queryPackageFromNpm("@types/node", "7.0.13");
                chai_1.assert.equal("@types/node", info.name);
                chai_1.assert.equal(info.version, "7.0.13");
                info = yield manager.queryPackageFromNpm("@types/node", "=7.0.13");
                chai_1.assert.equal("@types/node", info.name);
                chai_1.assert.equal(info.version, "7.0.13");
            });
        });
        it("get caret version range info for scoped packages", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const info = yield manager.queryPackageFromNpm("@types/node", "^6.0.0");
                chai_1.assert.equal(info.name, "@types/node");
                chai_1.assert.equal(info.version, "6.0.92"); // this test can fail if @types/node publish a 6.x version
            });
        });
    });
    describe("query github package", function () {
        it("get version info", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const info = yield manager.queryPackageFromGithub("lodash/lodash");
                chai_1.assert.equal("lodash", info.name);
                chai_1.assert.isDefined(info.version);
            });
        });
    });
    describe("query package info", function () {
        it("get version from github", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const info = yield manager.queryPackage("lodash", "lodash/lodash");
                chai_1.assert.equal("lodash", info.name);
                chai_1.assert.isDefined(info.version);
            });
        });
        it("get version from npm", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const info = yield manager.queryPackage("lodash", "4.17.4");
                chai_1.assert.equal("lodash", info.name);
                chai_1.assert.isDefined(info.version);
            });
        });
    });
    describe("locking", function () {
        beforeEach(function () {
            // reduce lock timeout for test reason
            manager.options.lockWait = 50;
            manager.options.lockStale = 1000;
        });
        it("cannot install multiple package concurrently", function () {
            return __awaiter(this, void 0, void 0, function* () {
                // I expect this to take some time...
                const installation1 = manager.installFromNpm("moment");
                // so I expect a concurrent installation to fail...
                const pluginSourcePath = path.join(__dirname, "my-basic-plugin");
                const installation2 = manager.installFromPath(pluginSourcePath);
                try {
                    yield installation2;
                }
                catch (err) {
                    yield installation1;
                    return;
                }
                throw new Error("Expected to fail");
            });
        });
        describe("given a lock", function () {
            beforeEach(function () {
                return __awaiter(this, void 0, void 0, function* () {
                    yield fs.ensureDir(manager.options.pluginsPath);
                    // simulate a lock
                    yield manager.syncLock();
                    manager.options.lockStale = 1000;
                });
            });
            afterEach(function () {
                return __awaiter(this, void 0, void 0, function* () {
                    // simulate a lock
                    yield manager.syncUnlock();
                });
            });
            it("cannot install package", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    const pluginSourcePath = path.join(__dirname, "my-basic-plugin");
                    const installation = manager.installFromPath(pluginSourcePath);
                    try {
                        yield installation;
                    }
                    catch (err) {
                        return;
                    }
                    throw new Error("Expected to fail");
                });
            });
            it("sync is considered stale after some time", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    yield sleep(manager.options.lockStale + 1);
                    // expected to succeeded because lock is considered stale
                    const pluginSourcePath = path.join(__dirname, "my-basic-plugin");
                    yield manager.installFromPath(pluginSourcePath);
                });
            });
        });
    });
});
function getGithubAuth() {
    try {
        return require("./github_auth.json");
    }
    catch (e) {
        if (process.env.github_auth_username) {
            return {
                type: "basic",
                username: process.env.github_auth_username,
                password: process.env.github_auth_token
            };
        }
        return undefined;
    }
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=PluginManagerSuite.js.map