import { assert } from "chai"; // tslint:disable-line:no-implicit-dependencies
import * as path from "path";
import * as fs from "fs-extra";
import * as os from "os";

import {PluginManager, IPluginInfo} from "../index";

describe("PluginManager:", function() {
	this.timeout(15000);
	this.slow(3000);

	let manager: PluginManager;

	beforeEach(async function() {
		manager = new PluginManager({
			githubAuthentication: getGithubAuth()
		});

		// sanity check to see if the pluginsPath is what we expect to be
		if (manager.options.pluginsPath !== path.join(__dirname, "../plugin_packages")) {
			throw new Error("Invalid plugins path " + manager.options.pluginsPath);
		}

		fs.removeSync(manager.options.pluginsPath);
	});

	afterEach(async function() {
		fs.removeSync(manager.options.pluginsPath);
	});

	describe("installation", function() {
		it("initially should not have any plugins", async function() {
			const plugins = await manager.list();
			assert.equal(plugins.length, 0);

			assert.isUndefined(manager.alreadyInstalled("cookie"));
			assert.isUndefined(manager.alreadyInstalled("moment"));
			assert.isUndefined(manager.alreadyInstalled("my-basic-plugin"));
		});

		it("initially cannot require any plugins", async function() {
			const isAvaialable = (name: string) => {
				try {
					manager.require(name);
					return true;
				} catch (e) {
					try {
						require(name);
						return true;
					} catch (e) {
						return false;
					}
				}
			};

			assert.isFalse(isAvaialable("cookie"), "cookie should not be available");
			assert.isFalse(isAvaialable("moment"), "moment should not be available");
			assert.isFalse(isAvaialable("my-basic-plugin"), "my-basic-plugin should not be available");
		});

		describe("from path", function() {
			it("installing a not existing plugin", async function() {
				try {
					await manager.installFromPath("/this/path/does-not-exists");
				} catch (e) {
					return;
				}

				throw new Error("Expected to fail");
			});

			it("installing a plugin", async function() {
				const pluginPath = path.join(__dirname, "my-basic-plugin");
				await manager.installFromPath(pluginPath);

				const pluginInstance = manager.require("my-basic-plugin");
				assert.isDefined(pluginInstance, "Plugin is not loaded");

				assert.equal(pluginInstance.myVariable, "value1");
			});

			it("installing a plugin with a special name", async function() {
				// name with dot (.)
				const pluginPath = path.join(__dirname, "my-plugin.js");
				await manager.installFromPath(pluginPath);
				const pluginInstance = manager.require("my-plugin.js");
				assert.isDefined(pluginInstance, "my-plugin.js!");

			});

			it("installing a plugin 2 times doesn't have effect", async function() {
				const pluginPath = path.join(__dirname, "my-basic-plugin");

				await manager.installFromPath(pluginPath);
				const pluginInstance = manager.require("my-basic-plugin");

				await manager.installFromPath(pluginPath);
				const pluginInstance2 = manager.require("my-basic-plugin");

				assert.equal(pluginInstance, pluginInstance2);
				assert.equal(pluginInstance.installDate, pluginInstance2.installDate);
			});

			it("installing a plugin 2 times with force options allow to force a reinstallation", async function() {
				const pluginPath = path.join(__dirname, "my-basic-plugin");

				await manager.installFromPath(pluginPath);
				const pluginInstance = manager.require("my-basic-plugin");

				await manager.installFromPath(pluginPath, {force: true});
				const pluginInstance2 = manager.require("my-basic-plugin");

				assert.notEqual(pluginInstance, pluginInstance2);
				assert.notEqual(pluginInstance.installDate, pluginInstance2.installDate);
			});

			it("installing a plugin with minimal info", async function() {
				const pluginPath = path.join(__dirname, "my-minimal-plugin");
				await manager.installFromPath(pluginPath);

				const pluginInstance = manager.require("my-minimal-plugin");
				assert.isDefined(pluginInstance, "Plugin is not loaded");

				assert.equal(pluginInstance.myVariable, "value1");
			});

			it("installing a plugin with node_modules should not copy node_modules", async function() {
				const pluginPath = path.join(__dirname, "my-plugin-with-npm-modules");
				await manager.installFromPath(pluginPath);

				const pluginInstance = manager.require("my-plugin-with-npm-modules");
				assert.isDefined(pluginInstance, "Plugin is not loaded");
				assert.equal(pluginInstance.myVariable, "value1");

				const pluginDestinationPath = path.join(manager.options.pluginsPath, "my-plugin-with-npm-modules");
				assert.isTrue(fs.existsSync(pluginDestinationPath),
					"Plugin directory should be copied");
				assert.isFalse(fs.existsSync(path.join(pluginDestinationPath, "node_modules")),
					"Directory node_modules should not be copied");
			});
		});

		describe("from npm", function() {
			it("installing a not existing plugin", async function() {
				try {
					await manager.installFromNpm("this-does-not-exists", "9.9.9");
				} catch (e) {
					return;
				}

				throw new Error("Expected to fail");
			});

			it("installing a plugin (cookie)", async function() {
				await manager.installFromNpm("cookie", "0.3.1");

				const cookie = manager.require("cookie");
				assert.isDefined(cookie, "Plugin is not loaded");

				// try to use the plugin
				const result = cookie.parse("foo=bar;x=y");
				assert.equal(result.foo, "bar");
				assert.equal(result.x, "y");
			});
		});

		describe("from github", function() {
			this.slow(4000);

			it("api configuration", function() {
				if (!manager.options.githubAuthentication) {
					// tslint:disable-next-line:no-console
					console.error("WARNING: No github_auth.json found, github api can give rate limits errors");
				}
			});

			it("installing a not existing plugin", async function() {
				try {
					await manager.installFromGithub("this/doesnotexists");
				} catch (e) {
					return;
				}

				throw new Error("Expected to fail");
			});

			// NOTE: Initially I have tried with lodash but it doesn't have a valid structure
			// (missing lodash.js, probably need a compilation)

			it("installing a plugin from master branch (underscore)", async function() {
				await manager.installFromGithub("jashkenas/underscore");

				const _ = manager.require("underscore");
				assert.isDefined(_, "Plugin is not loaded");

				// try to use the plugin
				const result = _.defaults({ a: 1 }, { a: 3, b: 2 });
				assert.equal(result.a, 1);
				assert.equal(result.b, 2);
			});

			it("installing a plugin from commit (underscore)", async function() {
				const pluginInfo = await manager.installFromGithub("jashkenas/underscore#1aed9ec");
				assert.equal(pluginInfo.version, "1.8.0");

				const _ = manager.require("underscore");
				assert.isDefined(_, "Plugin is not loaded");

				// try to use the plugin
				const result = _.defaults({ a: 1 }, { a: 3, b: 2 });
				assert.equal(result.a, 1);
				assert.equal(result.b, 2);
			});

			it("installing a plugin from tag (underscore)", async function() {
				const pluginInfo = await manager.installFromGithub("jashkenas/underscore#1.8.0");
				assert.equal(pluginInfo.version, "1.8.0");

				const _ = manager.require("underscore");
				assert.isDefined(_, "Plugin is not loaded");

				// try to use the plugin
				const result = _.defaults({ a: 1 }, { a: 3, b: 2 });
				assert.equal(result.a, 1);
				assert.equal(result.b, 2);
			});
		});

		describe("from code", function() {
			for (const invalidName of ["../test", ".\\test", "", undefined, null]) {
				it(`installing a not valid plugin name "${invalidName}" is not supported`, async function() {
					try {
						const n = invalidName as any;
						await manager.installFromNpm(n, "9.9.9");
					} catch (e) {
						return;
					}

					throw new Error("Expected to fail");
				});
			}

			it("installing a plugin", async function() {
				const code = `module.exports = "Hello from code plugin";`;
				await manager.installFromCode("my-code-plugin", code);

				const myPlugin = manager.require("my-code-plugin");
				assert.isDefined(myPlugin, "Plugin is not loaded");

				// try to use the plugin
				assert.equal(myPlugin, "Hello from code plugin");
			});

			it("update a plugin", async function() {
				const code = `module.exports = "Hello from code plugin";`;
				await manager.installFromCode("my-code-plugin", code);

				const myPlugin = manager.require("my-code-plugin");
				assert.equal(myPlugin, "Hello from code plugin");

				const codeV2 = `module.exports = "V2";`;
				await manager.installFromCode("my-code-plugin", codeV2);

				const myPluginV2 = manager.require("my-code-plugin");
				assert.equal(myPluginV2, "V2");
			});

			it("uninstalling a plugin", async function() {
				const code = `module.exports = "Hello from code plugin";`;
				await manager.installFromCode("my-code-plugin", code);

				const myPlugin = manager.require("my-code-plugin");
				assert.equal(myPlugin, "Hello from code plugin");

				await manager.uninstall("my-code-plugin");

				try {
					manager.require("my-code-plugin");
				} catch (e) {
					return;
				}
				throw new Error("Expected to fail");
			});
		});

	});

	describe("run script", function() {
		it("simple script", async function() {
			const code = `
			const a = 1;
			const b = 3;

			module.exports = a + b;
			`;

			const result = manager.runScript(code);
			assert.equal(result, 4);
		});

		it("script with comment at the end", async function() {
			const code = `
			const a = 1;
			const b = 3;

			module.exports = a + b;
			// some content`;

			const result = manager.runScript(code);
			assert.equal(result, 4);
		});

		it("require system module", async function() {
			const code = `
			const os = require("os");

			module.exports = os.hostname();
			`;

			const result = manager.runScript(code);
			assert.equal(result, os.hostname());
		});
	});

	describe("given an installed plugin", function() {
		let pluginInfo: IPluginInfo;

		beforeEach(async function() {
			pluginInfo = await manager.installFromNpm("moment", "2.18.1");
		});

		it("alreadyInstalled function should respect semver", function() {
			assert.isDefined(manager.alreadyInstalled("moment"));
			assert.isDefined(manager.alreadyInstalled("moment", "2.18.1"));
			assert.isDefined(manager.alreadyInstalled("moment", "v2.18.1"));
			assert.isDefined(manager.alreadyInstalled("moment", "=2.18.1"));
			assert.isDefined(manager.alreadyInstalled("moment", ">=2.18.1"));
			assert.isDefined(manager.alreadyInstalled("moment", "^2.18.1"));
			assert.isDefined(manager.alreadyInstalled("moment", "^2.0.0"));
			assert.isDefined(manager.alreadyInstalled("moment", ">=1.0.0"));

			assert.isUndefined(manager.alreadyInstalled("moment", "2.17.0"));
			assert.isUndefined(manager.alreadyInstalled("moment", "2.19.0"));
			assert.isUndefined(manager.alreadyInstalled("moment", "3.0.0"));
			assert.isUndefined(manager.alreadyInstalled("moment", "=3.0.0"));
			assert.isUndefined(manager.alreadyInstalled("moment", "^3.0.0"));
		});

		it("should be available", async function() {
			const plugins = await manager.list();
			assert.equal(plugins.length, 1);
			assert.equal(plugins[0].name, "moment");
			assert.equal(plugins[0].version, "2.18.1");
			assert.equal(plugins[0].location, path.join(manager.options.pluginsPath, "moment"));

			assert.isTrue(fs.existsSync(pluginInfo.location));

			const moment = manager.require("moment");
			assert.isDefined(moment, "Plugin is not loaded");

			assert.equal(manager.getInfo("moment"), pluginInfo);
		});

		it("require always return the same instance", async function() {
			const instance1 = manager.require("moment");
			const instance2 = manager.require("moment");

			assert.equal(instance1, instance2);
		});

		it("dynamic script can require a plugin", async function() {
			const code = `
			const m = require("moment");

			module.exports = m;
			`;

			const result = manager.runScript(code);

			const expectedInstance = manager.require("moment");
			assert.equal(expectedInstance, result);
		});

		it("code plugin can require another plugin", async function() {
			const code = `
			const m = require("moment");

			module.exports = m;
			`;

			await manager.installFromCode("myplugin", code);
			const result = manager.require("myplugin");

			const expectedInstance = manager.require("moment");
			assert.equal(expectedInstance, result);
		});

		describe("when uninstalled", function() {
			beforeEach(async function() {
				await manager.uninstall("moment");
			});

			it("should not be available anymore", async function() {
				const plugins = await manager.list();
				assert.equal(plugins.length, 0);

				assert.isFalse(fs.existsSync(pluginInfo.location), "Directory still exits");
			});

			it("requiring a not installed plugin throw an error", async function() {
				try {
					manager.require("moment");
				} catch (e) {
					return;
				}

				throw new Error("Expected to fail");
			});

			it("directly requiring a not installed plugin throw an error", async function() {
				try {
					require("moment"); // tslint:disable-line:no-implicit-dependencies
				} catch (e) {
					return;
				}

				throw new Error("Expected to fail");
			});

			it("requiring a not installed plugin using it's path throw an error", async function() {
				// Ensure that the plugin is really unloaded
				try {
					require(pluginInfo.location);
				} catch (e) {
					return;
				}

				throw new Error("Expected to fail");
			});
		});
	});

	describe("given a plugin x that depend on y", function() {
		describe("when plugin y is installed", function() {
			beforeEach(async function() {
				await manager.installFromPath(path.join(__dirname, "my-plugin-y"));
			});

			it("when plugin x is installed can require plugin y", async function() {
				await manager.installFromPath(path.join(__dirname, "my-plugin-x"));

				const x = manager.require("my-plugin-x");
				assert.equal(x.y, "y!");
			});

			it("when plugin x is installed can require plugin y sub file", async function() {
				await manager.installFromPath(path.join(__dirname, "my-plugin-x"));

				const x = manager.require("my-plugin-x");
				assert.equal(x.y_subFile, "y_subFile!");
			});
		});
	});

	describe("require", function() {
		it("plugins respect the same node.js behavior", async function() {
			const pluginSourcePath = path.join(__dirname, "my-test-plugin");
			await manager.installFromPath(pluginSourcePath);

			const pluginInstance = manager.require("my-test-plugin");
			assert.isDefined(pluginInstance, "Plugin is not loaded");

			assert.equal(pluginInstance.myVariable, "value1");
			assert.equal(pluginInstance.myVariable2, "value2");
			assert.equal(pluginInstance.myVariableFromSubFile, "value3");
			assert.equal(pluginInstance.myVariableFromSubFolder, "value4");
			assert.equal(pluginInstance.myVariableDifferentStyleOfRequire, "value5");
			assert.equal(pluginInstance.myJsonRequire.loaded, "yes");

			assert.equal(
				pluginInstance.myGlobals.__filename,
				path.join(manager.options.pluginsPath, "my-test-plugin", "index.js"));
			assert.equal(pluginInstance.myGlobals.__dirname, path.join(manager.options.pluginsPath, "my-test-plugin"));
			assert.equal(pluginInstance.myGlobals.process, process);
			assert.equal(pluginInstance.myGlobals.console, console);
			assert.equal(pluginInstance.myGlobals.clearImmediate, clearImmediate);
			assert.equal(pluginInstance.myGlobals.clearInterval, clearInterval);
			assert.equal(pluginInstance.myGlobals.clearTimeout, clearTimeout);
			assert.equal(pluginInstance.myGlobals.setImmediate, setImmediate);
			assert.equal(pluginInstance.myGlobals.setInterval, setInterval);
			assert.equal(pluginInstance.myGlobals.setTimeout, setTimeout);
			assert.equal(pluginInstance.myGlobals.Buffer, Buffer);
		});

		it("requre a plugin sub folder", async function() {
			const pluginSourcePath = path.join(__dirname, "my-test-plugin");
			await manager.installFromPath(pluginSourcePath);

			const result = manager.require("my-test-plugin/subFolder");
			assert.isDefined(result, "value4");
		});

		it("requre a plugin sub file", async function() {
			const pluginSourcePath = path.join(__dirname, "my-test-plugin");
			await manager.installFromPath(pluginSourcePath);

			const result = manager.require("my-test-plugin/subFolder/b");
			assert.isDefined(result, "value3");
		});

		it("index file can be required explicitly or implicitly", async function() {
			const pluginSourcePath = path.join(__dirname, "my-test-plugin");
			await manager.installFromPath(pluginSourcePath);

			const resultImplicit = manager.require("my-test-plugin");
			const resultExplicit = manager.require("my-test-plugin/index");
			const resultExplicit2 = manager.require("my-test-plugin/index.js");
			assert.equal(resultImplicit, resultExplicit);
			assert.equal(resultImplicit, resultExplicit2);
		});
	});

	describe("plugins dependencies", function() {
		this.slow(6000);

		describe("Npm dependencies", function() {
			it("dependencies are installed", async function() {
				const pluginSourcePath = path.join(__dirname, "my-plugin-with-dep");
				await manager.installFromPath(pluginSourcePath);

				assert.equal(manager.list().length, 2);
				assert.equal(manager.list()[0].name, "moment");
				assert.equal(manager.list()[1].name, "my-plugin-with-dep");
			});

			it("dependencies are available", async function() {
				const pluginSourcePath = path.join(__dirname, "my-plugin-with-dep");
				await manager.installFromPath(pluginSourcePath);

				const pluginInstance = manager.require("my-plugin-with-dep");

				assert.equal(pluginInstance.testDebug, require("debug")); // I expect to be exactly the same
				assert.equal(pluginInstance.testMoment, "1981/10/06");
			});

			it("by default @types dependencies are not installed", async function() {
				const pluginSourcePath = path.join(__dirname, "my-plugin-with-dep");
				await manager.installFromPath(pluginSourcePath);

				for (const p of manager.list()) {
					assert.notEqual(p.name, "@types/express");
				}
			});

			it("dependencies installed in the host are not installed but are available", async function() {
				// debug package is already available in the host

				const pluginSourcePath = path.join(__dirname, "my-plugin-with-dep");
				await manager.installFromPath(pluginSourcePath);

				for (const p of manager.list()) {
					assert.notEqual(p.name, "debug");
				}
			});
		});

		describe("Github dependencies", function() {

			it("dependencies are installed", async function() {
				const pluginSourcePath = path.join(__dirname, "my-plugin-with-git-dep");
				await manager.installFromPath(pluginSourcePath);

				assert.equal(manager.list().length, 2);
				assert.equal(manager.list()[0].name, "underscore");
				assert.equal(manager.list()[1].name, "my-plugin-with-git-dep");
			});
		});

		describe("Given some ignored dependencies", function() {
			beforeEach(function() {
				manager.options.ignoredDependencies = [/^@types\//, "moment"];
			});

			it("ignored dependencies are not installed", async function() {
				const pluginSourcePath = path.join(__dirname, "my-plugin-with-dep");
				await manager.installFromPath(pluginSourcePath);

				for (const p of manager.list()) {
					assert.notEqual(p.name, "moment");
				}
			});

			it("if the ignored dependencies is required the plugin will not be loaded", async function() {
				const pluginSourcePath = path.join(__dirname, "my-plugin-with-dep");
				await manager.installFromPath(pluginSourcePath);

				// expected to fail because moment is missing...
				try {
					manager.require("my-plugin-with-dep");
				} catch (err) {
					assert.equal(err.message, "Cannot find module 'moment'");
					return;
				}
				throw new Error("Expected to fail");
			});
		});

		describe("handling updates", function() {

			beforeEach(async function() {
				await manager.installFromPath(path.join(__dirname, "my-plugin-a@v1"));
				await manager.installFromPath(path.join(__dirname, "my-plugin-b")); // depend on my-plugin-a@1.0.0
			});

			it("updating a dependency will reload dependents", async function() {
				// load the plugin before installing the new version
				//  to ensure that the starting condition is valid
				assert.equal(manager.list().length, 2);
				assert.equal(manager.list()[0].name, "my-plugin-a");
				assert.equal(manager.list()[0].version, "1.0.0");
				assert.equal(manager.list()[1].name, "my-plugin-b");
				const initialPluginInstance = manager.require("my-plugin-b");
				assert.equal(initialPluginInstance, "a = v1");

				await manager.installFromPath(path.join(__dirname, "my-plugin-a@v2"));

				assert.equal(manager.list().length, 2);
				assert.isDefined(manager.alreadyInstalled("my-plugin-b", "=1.0.0"));
				assert.isDefined(manager.alreadyInstalled("my-plugin-a", "=2.0.0"));

				const pluginInstance = manager.require("my-plugin-b");
				assert.equal(pluginInstance, "a = v2");
			});
		});

		describe("given static dependencies", function() {
			beforeEach(function() {
				const momentStub = () => {
					return {
						format: () => "this is moment stub"
					};
				};

				manager.options.staticDependencies = {moment: momentStub};
			});

			it("static dependencies are not installed but resolved correctly", async function() {
				const pluginSourcePath = path.join(__dirname, "my-plugin-with-dep");
				await manager.installFromPath(pluginSourcePath);

				assert.equal(manager.list().length, 1);
				assert.equal(manager.list()[0].name, "my-plugin-with-dep");

				const pluginInstance = manager.require("my-plugin-with-dep");
				assert.equal(pluginInstance.testMoment, "this is moment stub");
			});
		});

		describe("Not compatible dependencies", function() {
			it("dependencies are installed", async function() {
				const pluginSourcePath = path.join(__dirname, "my-plugin-with-diff-dep");
				await manager.installFromPath(pluginSourcePath);

				assert.equal(manager.list().length, 2);
				assert.equal(manager.list()[0].name, "debug");
				assert.equal(manager.list()[1].name, "my-plugin-with-diff-dep");
			});

			it("dependencies are available", async function() {
				const pluginSourcePath = path.join(__dirname, "my-plugin-with-diff-dep");
				await manager.installFromPath(pluginSourcePath);

				const pluginInstance = manager.require("my-plugin-with-diff-dep");

				assert.notEqual(pluginInstance.testDebug, require("debug")); // I expect to be different (v2 vs v3)
			});
		});
	});

	describe("query npm package", function() {
		it("get latest version info", async function() {
			const info = await manager.queryPackageFromNpm("lodash");
			assert.equal("lodash", info.name);
			assert.isDefined(info.version, "Version not defined");
		});

		it("get latest version info (with string empty version)", async function() {
			const info = await manager.queryPackageFromNpm("lodash", "");
			assert.equal("lodash", info.name);
			assert.isDefined(info.version, "Version not defined");
		});

		it("get specific version info", async function() {
			let info = await manager.queryPackageFromNpm("lodash", "4.17.4");
			assert.equal(info.name, "lodash");
			assert.equal(info.version, "4.17.4");

			info = await manager.queryPackageFromNpm("lodash", "=4.17.4");
			assert.equal(info.name, "lodash");
			assert.equal(info.version, "4.17.4");
		});

		it("get caret version range info", async function() {
			const info = await manager.queryPackageFromNpm("lodash", "^3.0.0");
			assert.equal(info.name, "lodash");
			assert.equal(info.version, "3.10.1"); // this test can fail if lodash publish a 3.x version
		});

		it("get latest version info for scoped packages", async function() {
			const info = await manager.queryPackageFromNpm("@types/node");
			assert.equal("@types/node", info.name);
			assert.isDefined(info.version);
		});

		it("get specific version info for scoped packages", async function() {
			let info = await manager.queryPackageFromNpm("@types/node", "7.0.13");
			assert.equal("@types/node", info.name);
			assert.equal(info.version, "7.0.13");

			info = await manager.queryPackageFromNpm("@types/node", "=7.0.13");
			assert.equal("@types/node", info.name);
			assert.equal(info.version, "7.0.13");
		});

		it("get caret version range info for scoped packages", async function() {
			const info = await manager.queryPackageFromNpm("@types/node", "^6.0.0");
			assert.equal(info.name, "@types/node");
			assert.equal(info.version, "6.0.92"); // this test can fail if @types/node publish a 6.x version
		});
	});

	describe("query github package", function() {
		it("get version info", async function() {
			const info = await manager.queryPackageFromGithub("lodash/lodash");
			assert.equal("lodash", info.name);
			assert.isDefined(info.version);
		});
	});

	describe("query package info", function() {
		it("get version from github", async function() {
			const info = await manager.queryPackage("lodash", "lodash/lodash");
			assert.equal("lodash", info.name);
			assert.isDefined(info.version);
		});

		it("get version from npm", async function() {
			const info = await manager.queryPackage("lodash", "4.17.4");
			assert.equal("lodash", info.name);
			assert.isDefined(info.version);
		});
	});

	describe("locking", function() {
		beforeEach(function() {
			// reduce lock timeout for test reason
			manager.options.lockWait = 50;
			manager.options.lockStale = 1000;
		});

		it("cannot install multiple package concurrently", async function() {
			// I expect this to take some time...
			const installation1 = manager.installFromNpm("moment");

			// so I expect a concurrent installation to fail...
			const pluginSourcePath = path.join(__dirname, "my-basic-plugin");
			const installation2 = manager.installFromPath(pluginSourcePath);

			try {
				await installation2;
			} catch (err) {
				await installation1;
				return;
			}

			throw new Error("Expected to fail");
		});

		describe("given a lock", function() {

			beforeEach(async function() {
				await fs.ensureDir(manager.options.pluginsPath);

				// simulate a lock
				await (manager as any).syncLock();
				manager.options.lockStale = 1000;
			});

			afterEach(async function() {
				// simulate a lock
				await (manager as any).syncUnlock();
			});

			it("cannot install package", async function() {
				const pluginSourcePath = path.join(__dirname, "my-basic-plugin");
				const installation = manager.installFromPath(pluginSourcePath);

				try {
					await installation;
				} catch (err) {
					return;
				}

				throw new Error("Expected to fail");
			});

			it("sync is considered stale after some time", async function() {
				await sleep(manager.options.lockStale + 1);

				// expected to succeeded because lock is considered stale
				const pluginSourcePath = path.join(__dirname, "my-basic-plugin");
				await manager.installFromPath(pluginSourcePath);
			});
		});
	});
});


function getGithubAuth() {
	try {
		return require("./github_auth.json");
	} catch (e) {
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

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
