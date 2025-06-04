"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const os = __importStar(require("os"));
const semver = __importStar(require("semver"));
const index_1 = require("../dist/index");
describe("PluginManager:", function () {
    this.timeout(15000);
    this.slow(3000);
    let manager;
    beforeEach(function () {
        return __awaiter(this, void 0, void 0, function* () {
            manager = new index_1.PluginManager({
                githubAuthentication: getGithubAuth(),
                bitbucketAuthentication: getBitbucketAuth()
            });
            // sanity check to see if the pluginsPath is what we expect to be
            if (manager.options.pluginsPath !== path.join(__dirname, "../plugin_packages")) {
                throw new Error("Invalid plugins path " + manager.options.pluginsPath);
            }
            yield fs.remove(manager.options.pluginsPath);
        });
    });
    afterEach(function () {
        return __awaiter(this, void 0, void 0, function* () {
            yield fs.remove(manager.options.pluginsPath);
        });
    });
    describe("installation", function () {
        it("initially should not have any plugins", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const plugins = yield manager.list();
                chai_1.assert.equal(plugins.length, 0);
                chai_1.assert.isUndefined(manager.alreadyInstalled("cookie"));
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
                chai_1.assert.isFalse(isAvaialable("cookie"), "cookie should not be available");
                chai_1.assert.isFalse(isAvaialable("moment"), "moment should not be available");
                chai_1.assert.isFalse(isAvaialable("my-basic-plugin"), "my-basic-plugin should not be available");
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
            it("installing from a not valid npm url", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    manager = new index_1.PluginManager({
                        npmRegistryUrl: "http://davide.icardi.org/some-not-existing-registry/"
                    });
                    try {
                        yield manager.installFromNpm("moment");
                    }
                    catch (e) {
                        return;
                    }
                    throw new Error("Expected to throw");
                });
            });
            it("installing a not existing plugin", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        yield manager.installFromNpm("this-does-not-exists", "9.9.9");
                    }
                    catch (e) {
                        return;
                    }
                    throw new Error("Expected to throw");
                });
            });
            it("installing a plugin (cookie)", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    yield manager.installFromNpm("cookie", "0.3.1");
                    const cookie = manager.require("cookie");
                    chai_1.assert.isDefined(cookie, "Plugin is not loaded");
                    // try to use the plugin
                    const result = cookie.parse("foo=bar;x=y");
                    chai_1.assert.equal(result.foo, "bar");
                    chai_1.assert.equal(result.x, "y");
                });
            });
            it("installing a plugin already present in the folder will succeeded also if npm is down", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    // download it to ensure it is present
                    yield manager.installFromNpm("cookie", "0.3.1");
                    const failedManager = new index_1.PluginManager({
                        npmRegistryUrl: "https://httpstat.us/404"
                    });
                    yield failedManager.installFromNpm("cookie", "0.3.1");
                    const cookie = manager.require("cookie");
                    chai_1.assert.isDefined(cookie, "Plugin is not loaded");
                    // try to use the plugin
                    const result = cookie.parse("foo=bar;x=y");
                    chai_1.assert.equal(result.foo, "bar");
                    chai_1.assert.equal(result.x, "y");
                });
            });
            it("installing a plugin already present in the folder will fail if npm is down and noCache is used", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    // download it to ensure it is present
                    yield manager.installFromNpm("cookie", "0.3.1");
                    const failedManager = new index_1.PluginManager({
                        npmRegistryUrl: "http://davideicardi.com/some-not-existing-registry/",
                        npmInstallMode: "noCache"
                    });
                    try {
                        yield failedManager.installFromNpm("cookie", "0.3.1");
                    }
                    catch (e) {
                        return;
                    }
                    throw new Error("Expected to throw");
                });
            });
            it("installing a plugin already present in the folder will fail if npm is down and I ask for latest", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    // download it to ensure it is present
                    yield manager.installFromNpm("cookie", "0.3.1");
                    const failedManager = new index_1.PluginManager({
                        npmRegistryUrl: "http://davideicardi.com/some-not-existing-registry/"
                    });
                    try {
                        yield failedManager.installFromNpm("cookie");
                    }
                    catch (e) {
                        return;
                    }
                    throw new Error("Expected to throw");
                });
            });
        });
        describe("from github", function () {
            this.slow(4000);
            it("api configuration", function () {
                if (!manager.options.githubAuthentication) {
                    console.error("WARNING: No github_auth.json or github_auth_username env variable found, github api can give rate limits errors");
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
        describe("from bitbucket", function () {
            this.slow(4000);
            it("installing a not existing plugin", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        yield manager.installFromBitbucket("this/doesnotexists");
                    }
                    catch (e) {
                        return;
                    }
                    throw new Error("Expected to fail");
                });
            });
            it("installing a plugin from master branch", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    yield manager.installFromBitbucket("quaren/live-package-test");
                    const multiply = manager.require("live-package-test");
                    chai_1.assert.isDefined(multiply, "Plugin is not loaded");
                    const result = multiply(3, 4);
                    chai_1.assert.equal(result, 12);
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
            describe("given a plugin with an unknown dependency", function () {
                beforeEach(function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        const code = `module.exports = require("some-not-valid-dependency");`;
                        yield manager.installFromCode("my-code-plugin", code);
                    });
                });
                it("should give an error on require", function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        try {
                            manager.require("my-code-plugin");
                        }
                        catch (e) {
                            return;
                        }
                        throw new Error("Expected to fail");
                    });
                });
                it("after a failed require it shold fail also for next require", function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        // there was a bug that cache a failed plugin also on error
                        for (let i = 0; i < 10; i++) {
                            try {
                                manager.require("my-code-plugin");
                            }
                            catch (e) {
                                continue;
                            }
                            throw new Error("Expected to fail");
                        }
                    });
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
        it("alreadyInstalled function should support greater mode (for dependencies)", function () {
            chai_1.assert.isDefined(manager.alreadyInstalled("moment", undefined, "satisfiesOrGreater"));
            chai_1.assert.isDefined(manager.alreadyInstalled("moment", "2.18.1", "satisfiesOrGreater"));
            chai_1.assert.isDefined(manager.alreadyInstalled("moment", "v2.18.1", "satisfiesOrGreater"));
            chai_1.assert.isDefined(manager.alreadyInstalled("moment", "=2.18.1", "satisfiesOrGreater"));
            chai_1.assert.isDefined(manager.alreadyInstalled("moment", ">=2.18.1", "satisfiesOrGreater"));
            chai_1.assert.isDefined(manager.alreadyInstalled("moment", "^2.18.1", "satisfiesOrGreater"));
            chai_1.assert.isDefined(manager.alreadyInstalled("moment", "^2.0.0", "satisfiesOrGreater"));
            chai_1.assert.isDefined(manager.alreadyInstalled("moment", ">=1.0.0", "satisfiesOrGreater"));
            // this is considered installed with this mode
            chai_1.assert.isDefined(manager.alreadyInstalled("moment", "2.17.0", "satisfiesOrGreater"));
            chai_1.assert.isDefined(manager.alreadyInstalled("moment", "1.17.0", "satisfiesOrGreater"));
            chai_1.assert.isDefined(manager.alreadyInstalled("moment", "^1.17.0", "satisfiesOrGreater"));
            chai_1.assert.isUndefined(manager.alreadyInstalled("moment", "2.19.0", "satisfiesOrGreater"));
            chai_1.assert.isUndefined(manager.alreadyInstalled("moment", "3.0.0", "satisfiesOrGreater"));
            chai_1.assert.isUndefined(manager.alreadyInstalled("moment", "=3.0.0", "satisfiesOrGreater"));
            chai_1.assert.isUndefined(manager.alreadyInstalled("moment", "^3.0.0", "satisfiesOrGreater"));
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
        // TODO review this test, split it in microtest
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
                chai_1.assert.equal(pluginInstance.myGlobals.clearImmediate, clearImmediate);
                chai_1.assert.equal(pluginInstance.myGlobals.clearInterval, clearInterval);
                chai_1.assert.equal(pluginInstance.myGlobals.clearTimeout, clearTimeout);
                chai_1.assert.equal(pluginInstance.myGlobals.setImmediate, setImmediate);
                chai_1.assert.equal(pluginInstance.myGlobals.setInterval, setInterval);
                chai_1.assert.equal(pluginInstance.myGlobals.setTimeout, setTimeout);
                chai_1.assert.equal(pluginInstance.myGlobals.Buffer, Buffer);
                // NOTE: process and console are not the same but they should be available
                chai_1.assert.isDefined(pluginInstance.myGlobals.process);
                chai_1.assert.isDefined(pluginInstance.myGlobals.console);
            });
        });
        it("require absolute files", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const pluginSourcePath = path.join(__dirname, "my-plugin-with-abs-require");
                yield manager.installFromPath(pluginSourcePath);
                const pluginInstance = manager.require("my-plugin-with-abs-require");
                chai_1.assert.isDefined(pluginInstance, "Plugin is not loaded");
                chai_1.assert.equal(pluginInstance.myVariableFromAbsoluteFile, "value3");
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
        it("installing a plugin with folder as main", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const pluginPath = path.join(__dirname, "my-plugin-with-folder-as-main");
                yield manager.installFromPath(pluginPath);
                const pluginInstance = manager.require("my-plugin-with-folder-as-main");
                chai_1.assert.isDefined(pluginInstance, "Plugin is not loaded");
                chai_1.assert.equal(pluginInstance.myVariable, "value1");
            });
        });
        it("installing a plugin with a circular reference in require", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const pluginPath = path.join(__dirname, "my-plugin-with-circular-reference");
                yield manager.installFromPath(pluginPath);
                const pluginInstance = manager.require("my-plugin-with-circular-reference");
                chai_1.assert.isDefined(pluginInstance, "Plugin is not loaded");
                chai_1.assert.equal(pluginInstance.myVariable, "value1");
            });
        });
        it("file should wins over folder with the same name", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const pluginPath = path.join(__dirname, "my-plugin-file-win-over-folder");
                yield manager.installFromPath(pluginPath);
                const pluginInstance = manager.require("my-plugin-file-win-over-folder");
                chai_1.assert.isDefined(pluginInstance, "Plugin is not loaded");
                chai_1.assert.equal(pluginInstance, "i-am-the-file");
            });
        });
    });
    describe("scoped plugins", function () {
        it("installing a scoped plugin", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const pluginPath = path.join(__dirname, "my-basic-plugin-scoped");
                yield manager.installFromPath(pluginPath);
                const pluginInstance = manager.require("@myscope/my-basic-plugin-scoped");
                chai_1.assert.isDefined(pluginInstance, "Plugin is not loaded");
                chai_1.assert.equal(pluginInstance.myVariable, "value1");
            });
        });
        it("installing a scoped plugin with path", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const pluginPath = path.join(__dirname, "my-basic-plugin-scoped");
                yield manager.installFromPath(pluginPath);
                const pluginInstance = manager.require("@myscope/my-basic-plugin-scoped/index.js");
                chai_1.assert.isDefined(pluginInstance, "Plugin is not loaded");
                chai_1.assert.equal(pluginInstance.myVariable, "value1");
            });
        });
    });
    describe("plugins dependencies", function () {
        this.slow(6000);
        describe("Npm dependencies", function () {
            describe("Given a package with npm dependencies", function () {
                beforeEach(function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        const pluginSourcePath = path.join(__dirname, "my-plugin-with-dep");
                        yield manager.installFromPath(pluginSourcePath);
                    });
                });
                it("dependencies are installed", function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        chai_1.assert.equal(manager.list().length, 2);
                        chai_1.assert.equal(manager.list()[0].name, "moment");
                        chai_1.assert.equal(manager.list()[0].location, path.join(manager.options.pluginsPath, "moment"));
                        chai_1.assert.equal(manager.list()[1].name, "my-plugin-with-dep");
                        chai_1.assert.equal(manager.list()[1].location, path.join(manager.options.pluginsPath, "my-plugin-with-dep"));
                    });
                });
                it("dependencies are available", function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        const pluginInstance = manager.require("my-plugin-with-dep");
                        chai_1.assert.equal(pluginInstance.testDebug, require("debug")); // I expect to be exactly the same
                        chai_1.assert.equal(pluginInstance.testMoment, "1981/10/06");
                    });
                });
                it("by default @types dependencies are not installed", function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        for (const p of manager.list()) {
                            chai_1.assert.notEqual(p.name, "@types/express");
                        }
                    });
                });
                it("dependencies installed in the host are not installed but are available", function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        // debug package is already available in the host
                        for (const p of manager.list()) {
                            chai_1.assert.notEqual(p.name, "debug");
                        }
                    });
                });
                describe("uninstalling a dependency (moment)", function () {
                    beforeEach(function () {
                        return __awaiter(this, void 0, void 0, function* () {
                            yield manager.uninstall("moment");
                        });
                    });
                    it("requiring the plugin will fail", function () {
                        // VersionManager should be keep the dependencies of my-plugin-with-dep
                        // after uninstalling moment
                        const pluginInstance = manager.require("my-plugin-with-dep");
                        chai_1.assert.equal(pluginInstance.testMoment, "1981/10/06");
                    });
                    it("if dependency is reinstalled plugin will work again", function () {
                        return __awaiter(this, void 0, void 0, function* () {
                            yield manager.installFromNpm("moment", "2.18.1");
                            const pluginInstance = manager.require("my-plugin-with-dep");
                            chai_1.assert.equal(pluginInstance.testMoment, "1981/10/06");
                        });
                    });
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
                        chai_1.assert.isTrue(err.message.includes("Cannot find module 'moment'"));
                        return;
                    }
                    throw new Error("Expected to fail");
                });
            });
        });
        describe("Optional dependencies", function () {
            describe("Given a package with optional dependencies", function () {
                beforeEach(function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        const pluginSourcePath = path.join(__dirname, "my-plugin-with-opt-dep");
                        yield manager.installFromPath(pluginSourcePath);
                    });
                });
                it("optional dependencies are installed", function () {
                    chai_1.assert.equal(manager.list().length, 2);
                    chai_1.assert.equal(manager.list()[0].name, "moment");
                    chai_1.assert.equal(manager.list()[1].name, "my-plugin-with-opt-dep");
                });
                it("optional dependencies are available", function () {
                    const pluginInstance = manager.require("my-plugin-with-opt-dep");
                    chai_1.assert.equal(pluginInstance.testMoment, "1981/10/06");
                });
            });
            it("installation continues when an optional dependency fails", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    const pluginSourcePath = path.join(__dirname, "my-plugin-with-bad-opt-dep");
                    yield manager.installFromPath(pluginSourcePath);
                    chai_1.assert.equal(manager.list().length, 1);
                    chai_1.assert.equal(manager.list()[0].name, "my-plugin-with-bad-opt-dep");
                    const pluginInstance = manager.require("my-plugin-with-bad-opt-dep");
                    chai_1.assert.isTrue(pluginInstance.ok);
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
                    // - my-plugin-a@v1
                    // - my-plugin-b
                    //     - (depends) my-plugin-a@v1
                    chai_1.assert.equal(manager.require("my-plugin-a"), "v1");
                    const initialPluginInstance = manager.require("my-plugin-b");
                    chai_1.assert.equal(initialPluginInstance, "a = v1");
                    yield manager.installFromPath(path.join(__dirname, "my-plugin-a@v2"));
                    chai_1.assert.equal(manager.list().length, 2);
                    chai_1.assert.isDefined(manager.alreadyInstalled("my-plugin-b", "=1.0.0"));
                    chai_1.assert.isDefined(manager.alreadyInstalled("my-plugin-a", "=2.0.0"));
                    // - my-plugin-a@v2 <- only this has been updated
                    // - my-plugin-b
                    //     - (depends) my-plugin-a@v1 <- keep the dependency
                    // my-plugin-a should return 'a = v2' because it has been updated
                    chai_1.assert.equal(manager.require("my-plugin-a"), "v2");
                    // my-plugin-b should return 'a = v1' because it depends on my-plugin-a@1.0.0
                    const pluginInstance = manager.require("my-plugin-b");
                    chai_1.assert.equal(pluginInstance, "a = v1");
                });
            });
            it("updating a package that need a prev version will not downgrade the dependency", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    yield manager.installFromPath(path.join(__dirname, "my-plugin-a@v2")); // update dependency to v2
                    yield manager.uninstall("my-plugin-b");
                    try {
                        yield manager.installFromPath(path.join(__dirname, "my-plugin-b")); // depend on my-plugin-a@1.0.0
                        throw new Error("Expected to fail");
                    }
                    catch (err) {
                        // This test should fail.
                        // because my-plugin-b depends on my-plugin-a@1.0.0, but when my-plugin-b is uninstalled, my-plugin-a@1.0.0 is
                        // uninstalled. So VersionManager only keeps my-plugin-a@2.0.0, and my-plugin-a does not exist in npm.
                        chai_1.assert.isTrue(err.message.includes("Failed to get package 'my-plugin-a' Response error 404 Not Found"));
                    }
                    yield manager.installFromPath(path.join(__dirname, "my-plugin-a@v1"));
                    yield manager.installFromPath(path.join(__dirname, "my-plugin-b")); // depend on my-plugin-a@1.0.0
                    chai_1.assert.equal(manager.list().length, 2);
                    chai_1.assert.equal(manager.list()[0].name, "my-plugin-a");
                    chai_1.assert.equal(manager.list()[0].version, "1.0.0");
                    chai_1.assert.equal(manager.list()[1].name, "my-plugin-b");
                    const initialPluginInstance = manager.require("my-plugin-b");
                    chai_1.assert.equal(initialPluginInstance, "a = v1");
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
        describe("Not compatible dependencies with host", function () {
            // Note: Assume that host contains "debug" npm package at version 3
            it("dependencies are installed", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    // this package contains "debug" at version 2 (different from the host)
                    const pluginSourcePath = path.join(__dirname, "my-plugin-with-diff-dep");
                    yield manager.installFromPath(pluginSourcePath);
                    chai_1.assert.equal(manager.list().length, 3);
                    chai_1.assert.equal(manager.list()[0].name, "ms"); // this is a dependency of debug
                    chai_1.assert.equal(manager.list()[1].name, "debug");
                    chai_1.assert.equal(manager.list()[2].name, "my-plugin-with-diff-dep");
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
            it("dependencies is not the same", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    const pluginSourcePath = path.join(__dirname, "my-plugin-with-diff-dep");
                    yield manager.installFromPath(pluginSourcePath);
                    const pluginDebugInstance = manager.require("debug/package.json");
                    const hostDebugInstance = require("debug/package.json");
                    chai_1.assert.equal(pluginDebugInstance.version, "2.6.9");
                    chai_1.assert.equal(hostDebugInstance.version.substring(0, 1), "4");
                    chai_1.assert.notEqual(pluginDebugInstance.version, hostDebugInstance.version); // I expect to be different (v2 vs v3)
                });
            });
        });
        describe("given an host dependency", function () {
            const hostDependencyDestPath = path.join(__dirname, "..", "node_modules", "host-dependency");
            // given a dependency installed in the host
            // with version 1
            // note: I simulate an host dependency by manually copy it in the node_modules folder
            before(function () {
                return __awaiter(this, void 0, void 0, function* () {
                    const hostDependencySourcePath = path.join(__dirname, "host-dependency@v1");
                    yield fs.copy(hostDependencySourcePath, hostDependencyDestPath);
                });
            });
            after(function () {
                return __awaiter(this, void 0, void 0, function* () {
                    yield fs.remove(hostDependencyDestPath);
                });
            });
            it("it can be resolved", function () {
                const dependency = require("host-dependency");
                chai_1.assert.isDefined(dependency);
                chai_1.assert.equal(dependency, "v1.0.0");
                const dependencyPackage = require("host-dependency/package.json");
                chai_1.assert.equal(dependencyPackage.version, "1.0.0");
            });
            describe("when installing plugin that depends on the host dependency", function () {
                beforeEach(function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        // this package depends on "host-dependency" at version ^1.0.0
                        const pluginSourcePath = path.join(__dirname, "my-plugin-with-host-dep");
                        yield manager.installFromPath(pluginSourcePath);
                    });
                });
                it("dependency is not installed because already installed in host", function () {
                    chai_1.assert.equal(manager.list().length, 1);
                    chai_1.assert.equal(manager.list()[0].name, "my-plugin-with-host-dep");
                });
                it("it is resolved using the host dependency", function () {
                    const pluginInstance = manager.require("my-plugin-with-host-dep");
                    chai_1.assert.isDefined(pluginInstance);
                    chai_1.assert.equal(pluginInstance.testHostDependency, require("host-dependency"));
                    chai_1.assert.equal(pluginInstance.testHostDependency, "v1.0.0");
                });
                describe("when installing an update of the host dependency", function () {
                    beforeEach(function () {
                        return __awaiter(this, void 0, void 0, function* () {
                            const pluginSourcePath = path.join(__dirname, "host-dependency@v1.0.1");
                            yield manager.installFromPath(pluginSourcePath);
                        });
                    });
                    it("dependency is installed/updated", function () {
                        chai_1.assert.equal(manager.list().length, 2);
                        chai_1.assert.equal(manager.list()[0].name, "my-plugin-with-host-dep");
                        chai_1.assert.equal(manager.list()[1].name, "host-dependency");
                        chai_1.assert.equal(manager.list()[1].version, "1.0.1");
                    });
                    it("the updated dependency is now used by all dependants", function () {
                        const pluginInstance = manager.require("my-plugin-with-host-dep");
                        chai_1.assert.isDefined(pluginInstance);
                        chai_1.assert.notEqual(pluginInstance.testHostDependency, require("host-dependency"));
                        chai_1.assert.equal(pluginInstance.testHostDependency, "v1.0.1");
                    });
                    describe("when uninstalling the update", function () {
                        beforeEach(function () {
                            return __awaiter(this, void 0, void 0, function* () {
                                yield manager.uninstall("host-dependency");
                            });
                        });
                        it("dependency is uninstalled", function () {
                            chai_1.assert.equal(manager.list().length, 1);
                            chai_1.assert.equal(manager.list()[0].name, "my-plugin-with-host-dep");
                        });
                        it("it is again resolved using the host dependency", function () {
                            const pluginInstance = manager.require("my-plugin-with-host-dep");
                            chai_1.assert.isDefined(pluginInstance);
                            chai_1.assert.equal(pluginInstance.testHostDependency, require("host-dependency"));
                            chai_1.assert.equal(pluginInstance.testHostDependency, "v1.0.0");
                        });
                    });
                });
            });
        });
    });
    describe("query npm package", function () {
        it("get latest version info", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const info = yield manager.queryPackageFromNpm("lodash");
                chai_1.assert.equal("lodash", info.name);
                chai_1.assert.isDefined(info.version, "Version not defined");
            });
        });
        it("get latest version info (with string empty version)", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const info = yield manager.queryPackageFromNpm("lodash", "");
                chai_1.assert.equal("lodash", info.name);
                chai_1.assert.isDefined(info.version, "Version not defined");
            });
        });
        it("get latest version info (with undefined version)", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const info = yield manager.queryPackageFromNpm("lodash", undefined);
                chai_1.assert.equal("lodash", info.name);
                chai_1.assert.isDefined(info.version, "Version not defined");
            });
        });
        it("get latest version info (with null version)", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const info = yield manager.queryPackageFromNpm("lodash", null);
                chai_1.assert.equal("lodash", info.name);
                chai_1.assert.isDefined(info.version, "Version not defined");
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
                chai_1.assert.isTrue(semver.gt(info.version, "6.0.0"), "Should get a version greater than 6.0.0");
                chai_1.assert.isTrue(semver.lt(info.version, "7.0.0"), "Should get a version less than 7.0.0");
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
                    // simulate unlock
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
    describe("sandbox", function () {
        describe("given globals variables", function () {
            it("should define the same globals", function () {
                const code = `module.exports = global;`;
                const result = manager.runScript(code);
                chai_1.assert.equal(result.Buffer, Buffer);
            });
            it("unknown globals throw an exception", function () {
                const code = `module.exports = someUnknownGlobalVar;`;
                try {
                    manager.runScript(code);
                }
                catch (_a) {
                    return;
                }
                throw new Error("Excepted to fail");
            });
            it("globals are available", function () {
                const code = `module.exports = encodeURIComponent("test/1");`;
                const result = manager.runScript(code);
                chai_1.assert.equal(result, encodeURIComponent("test/1"));
            });
            it("globals are inherited from host", function () {
                // Note: this is a bad practice (modify global...) but I support it
                global.myCustomGlobalVar = "myCustomGlobalVar1";
                const code = `module.exports = myCustomGlobalVar`;
                const result = manager.runScript(code);
                chai_1.assert.equal(result, "myCustomGlobalVar1");
            });
            it("globals can be overwritten from host", function () {
                manager.options.sandbox.global = Object.assign(Object.assign({}, global), { myCustomGlobalVar: "myCustomGlobalVar2" });
                const code = `module.exports = myCustomGlobalVar`;
                const result = manager.runScript(code);
                chai_1.assert.equal(result, "myCustomGlobalVar2");
            });
            it("overwritten globals not affect host, is isolated", function () {
                chai_1.assert.isUndefined(global.SOME_OTHER_KEY, "Initially host should not have it");
                manager.options.sandbox.global = Object.assign(Object.assign({}, global), { SOME_OTHER_KEY: "test1" });
                const code = `module.exports = SOME_OTHER_KEY;`;
                const result = manager.runScript(code);
                chai_1.assert.equal(result, "test1");
                chai_1.assert.isUndefined(global.SOME_OTHER_KEY, "Host should not inherit it");
            });
        });
        describe("given nodes types", function () {
            it("should access Buffer", function () {
                chai_1.assert.equal(manager.runScript(`module.exports = Buffer.from("hello", "utf-8").length`), 5);
                chai_1.assert.equal(manager.runScript(`module.exports = Buffer.toString()`), Buffer.toString());
            });
        });
        describe("given js types", function () {
            it("should access URL", function () {
                chai_1.assert.equal(manager.runScript(`module.exports = new URL('/foo', 'https://example.org/').toString()`), 'https://example.org/foo');
                chai_1.assert.equal(manager.runScript(`module.exports = URL.toString()`), URL.toString());
            });
            it("should access Error", function () {
                chai_1.assert.equal(manager.runScript(`module.exports = new Error("an error").message;`), "an error");
            });
            it("should access URLSearchParams", function () {
                chai_1.assert.equal(manager.runScript(`module.exports = new URLSearchParams('user=abc&query=xyz').get('user');`), "abc");
            });
            it("should access Date", function () {
                chai_1.assert.equal(manager.runScript(`module.exports = new Date(1635107735931).toString()`), new Date(1635107735931).toString());
            });
            it("should access Function", function () {
                chai_1.assert.equal(manager.runScript(`module.exports = (function(){}).constructor === Function`), true);
            });
            it("should access Object", function () {
                const code = `
				module.exports = {
					var1: new Object().constructor === Object,
					var2: ({}).constructor === Object,
				}`;
                const result = manager.runScript(code);
                chai_1.assert.isTrue(result.var1);
                chai_1.assert.isTrue(result.var2);
            });
        });
        describe("given an environment variables", function () {
            beforeEach(function () {
                process.env.SOME_RANDOM_KEY = "test1";
            });
            afterEach(function () {
                delete process.env.SOME_RANDOM_KEY;
            });
            it("plugins inherit from host", function () {
                const code = `module.exports = process.env.SOME_RANDOM_KEY;`;
                const result = manager.runScript(code);
                chai_1.assert.equal(result, "test1");
            });
            it("allow to override env from host", function () {
                manager.options.sandbox.env = { SOME_KEY: "test2" };
                const code = `module.exports = process.env.SOME_RANDOM_KEY;`;
                const result = manager.runScript(code);
                chai_1.assert.isUndefined(result);
                const code2 = `module.exports = process.env.SOME_KEY;`;
                const result2 = manager.runScript(code2);
                chai_1.assert.equal(result2, "test2");
            });
            it("overwritten env not affect host, is isolated", function () {
                chai_1.assert.isUndefined(process.env.SOME_PLUGIN_KEY, "Initially host should not have it");
                manager.options.sandbox.env = { SOME_PLUGIN_KEY: "test2" };
                const code = `module.exports = process.env.SOME_PLUGIN_KEY;`;
                const result = manager.runScript(code);
                chai_1.assert.equal(result, "test2");
                chai_1.assert.isUndefined(process.env.SOME_PLUGIN_KEY, "Host should not inherit it");
            });
        });
        describe("sandbox specific for plugin", function () {
            it("set sandbox for a specific plugin", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    const code = `module.exports = process.env.SOME_RANDOM_KEY;`;
                    yield manager.installFromCode("my-plugin-with-sandbox", code);
                    manager.setSandboxTemplate("my-plugin-with-sandbox", {
                        env: {
                            SOME_RANDOM_KEY: "test1"
                        }
                    });
                    const result = manager.require("my-plugin-with-sandbox");
                    chai_1.assert.equal(result, "test1");
                });
            });
            it("a plugin share the same globals between modules", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    const pluginSourcePath = path.join(__dirname, "my-plugin-env-global");
                    yield manager.installFromPath(pluginSourcePath);
                    const result = manager.require("my-plugin-env-global");
                    chai_1.assert.equal(result, "Hello world!");
                });
            });
            it("a plugin doesn't share global and env with host, is isolated", function () {
                chai_1.assert.isUndefined(process.env.SOME_PLUGIN_KEY, "Initially host should not have it");
                chai_1.assert.isUndefined(global.SOME_OTHER_KEY, "Initially host should not have it");
                const code = `
				global.SOME_OTHER_KEY = "test1";
				process.env.SOME_PLUGIN_KEY = "test2";
				module.exports = global.SOME_OTHER_KEY + process.env.SOME_PLUGIN_KEY;`;
                const result = manager.runScript(code);
                chai_1.assert.equal(result, "test1test2");
                chai_1.assert.isUndefined(process.env.SOME_PLUGIN_KEY, "Host should not inherit it");
                chai_1.assert.isUndefined(global.SOME_OTHER_KEY, "Host should not have it");
            });
        });
        describe("NodeRequire object inside a plugin", function () {
            it("require system module", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    const code = `module.exports = require("fs");`;
                    yield manager.installFromCode("my-plugin-with-sandbox", code);
                    const result = manager.require("my-plugin-with-sandbox");
                    chai_1.assert.equal(result, require("fs"));
                });
            });
            it("require.resolve system module", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    const code = `module.exports = require.resolve("fs");`;
                    yield manager.installFromCode("my-plugin-with-sandbox", code);
                    const result = manager.require("my-plugin-with-sandbox");
                    chai_1.assert.equal(result, require.resolve("fs"));
                });
            });
        });
    });
    describe("uninstall", function () {
        afterEach(function () {
            return __awaiter(this, void 0, void 0, function* () {
                yield manager.uninstallAll();
            });
        });
        it("uninstall a single plugin", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const pluginSourcePath = path.join(__dirname, "my-basic-plugin");
                yield manager.installFromPath(pluginSourcePath);
                const plugins = manager.list();
                chai_1.assert.equal(plugins.length, 1);
                const pluginFiles = yield fs.readdir(manager.options.pluginsPath);
                chai_1.assert.equal(pluginFiles.filter(f => f !== '.versions').length, 1);
                const versionsPath = path.join(manager.options.pluginsPath, ".versions");
                const versionFiles = yield fs.readdir(versionsPath);
                chai_1.assert.equal(versionFiles.length, 1);
                yield manager.uninstall("my-basic-plugin");
                const cleanedPlugins = manager.list();
                chai_1.assert.equal(cleanedPlugins.length, 0);
                const cleanedPluginFiles = yield fs.readdir(manager.options.pluginsPath);
                chai_1.assert.equal(cleanedPluginFiles.filter(f => f !== '.versions').length, 0);
                const cleanedVersionFiles = yield fs.readdir(versionsPath);
                chai_1.assert.equal(cleanedVersionFiles.length, 0);
            });
        });
        it("uninstall a single plugin with multiple versions", function () {
            return __awaiter(this, void 0, void 0, function* () {
                yield manager.installFromPath(path.join(__dirname, "my-plugin-a@v1"));
                yield manager.installFromPath(path.join(__dirname, "my-plugin-a@v2"));
                const plugins = manager.list();
                chai_1.assert.equal(plugins.length, 1);
                chai_1.assert.equal(plugins[0].name, "my-plugin-a");
                chai_1.assert.equal(plugins[0].version, "2.0.0");
                const pluginFiles = yield fs.readdir(manager.options.pluginsPath);
                chai_1.assert.equal(pluginFiles.filter(f => f !== '.versions').length, 1);
                const versionsPath = path.join(manager.options.pluginsPath, ".versions");
                const versionFiles = yield fs.readdir(versionsPath);
                chai_1.assert.equal(versionFiles.length, 1);
                yield manager.uninstall("my-plugin-a");
                const cleanedPlugins = manager.list();
                chai_1.assert.equal(cleanedPlugins.length, 0);
                const cleanedPluginFiles = yield fs.readdir(manager.options.pluginsPath);
                chai_1.assert.equal(cleanedPluginFiles.filter(f => f !== '.versions').length, 0);
                const cleanedVersionFiles = yield fs.readdir(versionsPath);
                chai_1.assert.equal(cleanedVersionFiles.length, 0);
            });
        });
        it("uninstall a single plugin with multiple versions and keep other plugins", function () {
            return __awaiter(this, void 0, void 0, function* () {
                yield manager.installFromPath(path.join(__dirname, "my-plugin-a@v1"));
                yield manager.installFromPath(path.join(__dirname, "my-basic-plugin"));
                yield manager.installFromPath(path.join(__dirname, "my-plugin-a@v2"));
                const plugins = manager.list();
                chai_1.assert.equal(plugins.length, 2);
                chai_1.assert.equal(plugins[0].name, "my-basic-plugin");
                chai_1.assert.equal(plugins[1].name, "my-plugin-a");
                chai_1.assert.equal(plugins[1].version, "2.0.0");
                const pluginFiles = yield fs.readdir(manager.options.pluginsPath);
                chai_1.assert.equal(pluginFiles.filter(f => f !== '.versions').length, 2);
                const versionsPath = path.join(manager.options.pluginsPath, ".versions");
                const versionFiles = yield fs.readdir(versionsPath);
                chai_1.assert.equal(versionFiles.length, 2);
                yield manager.uninstall("my-plugin-a");
                const cleanedPlugins = manager.list();
                chai_1.assert.equal(cleanedPlugins.length, 1);
                chai_1.assert.equal(cleanedPlugins[0].name, "my-basic-plugin");
                const cleanedPluginFiles = yield fs.readdir(manager.options.pluginsPath);
                chai_1.assert.equal(cleanedPluginFiles.filter(f => f !== '.versions').length, 1);
                const cleanedVersionFiles = yield fs.readdir(versionsPath);
                chai_1.assert.equal(cleanedVersionFiles.length, 1);
            });
        });
        it("uninstall a plugin with dependencies, uninstall main package", function () {
            return __awaiter(this, void 0, void 0, function* () {
                yield manager.installFromPath(path.join(__dirname, "my-plugin-with-dep"));
                const plugins = manager.list();
                chai_1.assert.equal(plugins.length, 2);
                chai_1.assert.equal(plugins[0].name, "moment");
                chai_1.assert.equal(plugins[1].name, "my-plugin-with-dep");
                const pluginFiles = yield fs.readdir(manager.options.pluginsPath);
                chai_1.assert.equal(pluginFiles.filter(f => f !== '.versions').length, 2);
                const versionsPath = path.join(manager.options.pluginsPath, ".versions");
                const versionFiles = yield fs.readdir(versionsPath);
                chai_1.assert.equal(versionFiles.length, 2);
                yield manager.uninstall("my-plugin-with-dep");
                // Uninstalling my-plugin-with-dep should not uninstall its dependencies
                const cleanedPlugins = manager.list();
                chai_1.assert.equal(cleanedPlugins.length, 1);
                chai_1.assert.equal(cleanedPlugins[0].name, "moment");
                const cleanedPluginFiles = yield fs.readdir(manager.options.pluginsPath);
                chai_1.assert.equal(cleanedPluginFiles.filter(f => f !== '.versions').length, 1);
                const cleanedVersionFiles = yield fs.readdir(versionsPath);
                chai_1.assert.equal(cleanedVersionFiles.length, 1);
            });
        });
        it("uninstall a plugin with dependencies, uninstall dependency", function () {
            return __awaiter(this, void 0, void 0, function* () {
                yield manager.installFromPath(path.join(__dirname, "my-plugin-with-dep"));
                const plugins = manager.list();
                chai_1.assert.equal(plugins.length, 2);
                chai_1.assert.equal(plugins[0].name, "moment");
                chai_1.assert.equal(plugins[1].name, "my-plugin-with-dep");
                const pluginFiles = yield fs.readdir(manager.options.pluginsPath);
                chai_1.assert.equal(pluginFiles.filter(f => f !== '.versions').length, 2);
                const versionsPath = path.join(manager.options.pluginsPath, ".versions");
                const versionFiles = yield fs.readdir(versionsPath);
                chai_1.assert.equal(versionFiles.length, 2);
                yield manager.uninstall("moment");
                // Uninstalling moment should not uninstall my-plugin-with-dep and its dependencies
                const cleanedPlugins = manager.list();
                chai_1.assert.equal(cleanedPlugins.length, 1);
                chai_1.assert.equal(cleanedPlugins[0].name, "my-plugin-with-dep");
                const cleanedPluginFiles = yield fs.readdir(manager.options.pluginsPath);
                chai_1.assert.equal(cleanedPluginFiles.filter(f => f !== '.versions').length, 1);
                const cleanedVersionFiles = yield fs.readdir(versionsPath);
                chai_1.assert.equal(cleanedVersionFiles.length, 2);
            });
        });
        it("uninstall a plugin with host dependencies", function () {
            return __awaiter(this, void 0, void 0, function* () {
                yield manager.installFromPath(path.join(__dirname, "my-plugin-with-host-dep"));
                const plugins = manager.list();
                chai_1.assert.equal(plugins.length, 1);
                chai_1.assert.equal(plugins[0].name, "my-plugin-with-host-dep");
                const pluginFiles = yield fs.readdir(manager.options.pluginsPath);
                chai_1.assert.equal(pluginFiles.filter(f => f !== '.versions').length, 1);
                const versionsPath = path.join(manager.options.pluginsPath, ".versions");
                const versionFiles = yield fs.readdir(versionsPath);
                chai_1.assert.equal(versionFiles.length, 1);
                yield manager.uninstall("my-plugin-with-host-dep");
                const cleanedPlugins = manager.list();
                chai_1.assert.equal(cleanedPlugins.length, 0);
                const cleanedPluginFiles = yield fs.readdir(manager.options.pluginsPath);
                chai_1.assert.equal(cleanedPluginFiles.filter(f => f !== '.versions').length, 0);
                const cleanedVersionFiles = yield fs.readdir(versionsPath);
                chai_1.assert.equal(cleanedVersionFiles.length, 0);
            });
        });
        it("uninstall a scoped plugin", function () {
            return __awaiter(this, void 0, void 0, function* () {
                yield manager.installFromPath(path.join(__dirname, "my-basic-plugin-scoped"));
                const plugins = manager.list();
                chai_1.assert.equal(plugins.length, 1);
                chai_1.assert.equal(plugins[0].name, "@myscope/my-basic-plugin-scoped");
                const pluginFiles = yield fs.readdir(manager.options.pluginsPath);
                chai_1.assert.equal(pluginFiles.filter(f => f !== '.versions').length, 1);
                const versionsPath = path.join(manager.options.pluginsPath, ".versions");
                const versionFiles = yield fs.readdir(versionsPath);
                chai_1.assert.equal(versionFiles.length, 1);
                yield manager.uninstall("@myscope/my-basic-plugin-scoped");
                const cleanedPlugins = manager.list();
                chai_1.assert.equal(cleanedPlugins.length, 0);
                const cleanedPluginFiles = yield fs.readdir(manager.options.pluginsPath);
                chai_1.assert.equal(cleanedPluginFiles.filter(f => f !== '.versions').length, 0);
                const cleanedVersionFiles = yield fs.readdir(versionsPath);
                chai_1.assert.equal(cleanedVersionFiles.length, 0);
            });
        });
        it("uninstall a scoped plugin, keep scope directory", function () {
            return __awaiter(this, void 0, void 0, function* () {
                yield manager.installFromPath(path.join(__dirname, "my-basic-plugin-scoped"));
                yield manager.installFromPath(path.join(__dirname, "my-plugin-a@v1"));
                yield manager.installFromPath(path.join(__dirname, "my-plugin-scoped-with-dep"));
                const plugins = manager.list();
                chai_1.assert.equal(plugins.length, 3);
                chai_1.assert.equal(plugins[0].name, "@myscope/my-basic-plugin-scoped");
                chai_1.assert.equal(plugins[1].name, "my-plugin-a");
                chai_1.assert.equal(plugins[2].name, "@myscope/my-plugin-scoped-with-dep");
                const pluginFiles = yield fs.readdir(manager.options.pluginsPath);
                chai_1.assert.equal(pluginFiles.filter(f => f !== '.versions').length, 2);
                const versionsPath = path.join(manager.options.pluginsPath, ".versions");
                const versionFiles = yield fs.readdir(versionsPath);
                chai_1.assert.equal(versionFiles.length, 2);
                yield manager.uninstall("my-plugin-a");
                // VersionManager should keep the dependencies of my-plugin-scoped-with-dep
                const plugin = manager.require("@myscope/my-plugin-scoped-with-dep");
                chai_1.assert.equal(plugin, "a = v1");
                yield manager.uninstall("@myscope/my-plugin-scoped-with-dep");
                const cleanedPlugins = manager.list();
                chai_1.assert.equal(cleanedPlugins.length, 1);
                chai_1.assert.equal(cleanedPlugins[0].name, "@myscope/my-basic-plugin-scoped");
                const cleanedPluginFiles = yield fs.readdir(manager.options.pluginsPath);
                chai_1.assert.equal(cleanedPluginFiles.filter(f => f !== '.versions').length, 1);
                chai_1.assert.isTrue(cleanedPluginFiles.includes("@myscope"));
                const scopedPluginFiles = yield fs.readdir(path.join(manager.options.pluginsPath, "@myscope"));
                chai_1.assert.equal(scopedPluginFiles.length, 1);
                chai_1.assert.isTrue(scopedPluginFiles.includes("my-basic-plugin-scoped"));
                const cleanedVersionFiles = yield fs.readdir(versionsPath);
                chai_1.assert.equal(cleanedVersionFiles.length, 1);
                chai_1.assert.isTrue(cleanedVersionFiles.includes("@myscope"));
                const scopedVersionFiles = yield fs.readdir(path.join(versionsPath, "@myscope"));
                chai_1.assert.equal(scopedVersionFiles.length, 1);
                chai_1.assert.isTrue(scopedVersionFiles.includes("my-basic-plugin-scoped@1.0.0"));
            });
        });
        it("uninstall a plugin with scoped dependencies", function () {
            return __awaiter(this, void 0, void 0, function* () {
                yield manager.installFromPath(path.join(__dirname, "my-basic-plugin-scoped"));
                yield manager.installFromPath(path.join(__dirname, "my-plugin-with-scoped-dep"));
                const plugins = manager.list();
                chai_1.assert.equal(plugins.length, 2);
                chai_1.assert.equal(plugins[0].name, "@myscope/my-basic-plugin-scoped");
                chai_1.assert.equal(plugins[1].name, "my-plugin-with-scoped-dep");
                const pluginFiles = yield fs.readdir(manager.options.pluginsPath);
                chai_1.assert.equal(pluginFiles.filter(f => f !== '.versions').length, 2);
                const versionsPath = path.join(manager.options.pluginsPath, ".versions");
                const versionFiles = yield fs.readdir(versionsPath);
                chai_1.assert.equal(versionFiles.length, 2);
                yield manager.uninstall("@myscope/my-basic-plugin-scoped");
                yield manager.uninstall("my-plugin-with-scoped-dep");
                const cleanedPlugins = manager.list();
                chai_1.assert.equal(cleanedPlugins.length, 0);
                const cleanedPluginFiles = yield fs.readdir(manager.options.pluginsPath);
                chai_1.assert.equal(cleanedPluginFiles.filter(f => f !== '.versions').length, 0);
                const cleanedVersionFiles = yield fs.readdir(versionsPath);
                chai_1.assert.equal(cleanedVersionFiles.length, 0);
            });
        });
        it("uninstall a plugin with git dependencies", function () {
            return __awaiter(this, void 0, void 0, function* () {
                yield manager.installFromPath(path.join(__dirname, "my-plugin-with-git-dep"));
                const plugins = manager.list();
                chai_1.assert.equal(plugins.length, 2);
                chai_1.assert.equal(plugins[0].name, "underscore");
                chai_1.assert.equal(plugins[1].name, "my-plugin-with-git-dep");
                const pluginFiles = yield fs.readdir(manager.options.pluginsPath);
                chai_1.assert.equal(pluginFiles.filter(f => f !== '.versions').length, 2);
                const versionsPath = path.join(manager.options.pluginsPath, ".versions");
                const versionFiles = yield fs.readdir(versionsPath);
                chai_1.assert.equal(versionFiles.length, 2);
                const resultBeforeUninstall = manager.require("my-plugin-with-git-dep");
                chai_1.assert.equal(resultBeforeUninstall.testUnderscore, "hello underscore!");
                yield manager.uninstall("underscore");
                // VersionManager should keep the dependencies of my-plugin-with-git-dep after uninstalling underscore
                const resultAfterUninstall = manager.require("my-plugin-with-git-dep");
                chai_1.assert.equal(resultAfterUninstall.testUnderscore, "hello underscore!");
                const cleanedPlugins = manager.list();
                chai_1.assert.equal(cleanedPlugins.length, 1);
                chai_1.assert.equal(cleanedPlugins[0].name, "my-plugin-with-git-dep");
                const cleanedPluginFiles = yield fs.readdir(manager.options.pluginsPath);
                chai_1.assert.equal(cleanedPluginFiles.filter(f => f !== '.versions').length, 1);
                const cleanedVersionFiles = yield fs.readdir(versionsPath);
                chai_1.assert.equal(cleanedVersionFiles.length, 2);
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
function getBitbucketAuth() {
    try {
        return require("./bitbucket_auth.json");
    }
    catch (e) {
        if (process.env.bitbucket_auth_username) {
            return {
                type: "basic",
                username: process.env.bitbucket_auth_username,
                password: process.env.bitbucket_auth_token
            };
        }
        return undefined;
    }
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
process.on("unhandledRejection", (reason, p) => {
    console.log("Unhandled Rejection at: Promise", p, "reason:", (reason && reason.stack));
});
//# sourceMappingURL=PluginManagerSuite.js.map