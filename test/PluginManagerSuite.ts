import { assert } from "chai";
import * as path from "path";
import * as fs from "fs-extra";
import * as os from "os";

import {PluginManager, IPluginInfo} from "../index";

describe("PluginManager suite", function() {
	this.timeout(15000);
	this.slow(3000);

	let manager: PluginManager;

	beforeEach(async function() {
		manager = new PluginManager();

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

			assert.isUndefined(manager.alreadyInstalled("moment"));
			assert.isUndefined(manager.alreadyInstalled("my-basic-plugin"));
		});

		it("installing a plugin from path", async function() {
			const pluginPath = path.join(__dirname, "my-basic-plugin");
			const pluginInfo = await manager.installFromPath(pluginPath);

			const pluginInstance = manager.require("my-basic-plugin");
			assert.isDefined(pluginInstance, "Plugin is not loaded");

			assert.equal(pluginInstance.myVariable, "value1");
		});

		it("installing a plugin with minimal info", async function() {
			const pluginPath = path.join(__dirname, "my-minimal-plugin");
			const pluginInfo = await manager.installFromPath(pluginPath);

			const pluginInstance = manager.require("my-minimal-plugin");
			assert.isDefined(pluginInstance, "Plugin is not loaded");

			assert.equal(pluginInstance.myVariable, "value1");
		});

		it("installing a not existing plugin using npm", async function() {
			try {
				const pluginInfo = await manager.installFromNpm("this-does-not-exists", "9.9.9");
			} catch (e) {
				return;
			}

			throw new Error("Expected to fail");
		});

		it("installing a plugin using npm", async function() {
			const pluginInfo = await manager.installFromNpm("lodash", "4.17.4");

			const _ = manager.require("lodash");
			assert.isDefined(_, "Plugin is not loaded");

			// try to use the plugin
			const result = _.defaults({ a: 1 }, { a: 3, b: 2 });
			assert.equal(result.a, 1);
			assert.equal(result.b, 2);
		});
	});

	describe("dynamic script", function() {
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
			const instance = manager.require("moment");

			assert.equal(instance, result);
		});

		describe("when uninstalled", function() {
			beforeEach(async function() {
				await manager.uninstall("moment");
			});

			it("should not be available anymore", async function() {
				const plugins = await manager.list();
				assert.equal(plugins.length, 0);

				assert.isFalse(fs.existsSync(pluginInfo.location), "Directory still exits");

				try {
					manager.require("moment");
				} catch (e) {
					return;
				}

				throw new Error("Expected to fail");
			});

			it("requiring a not installed plugin throw an error", async function() {
				try {
					require("moment");
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

	describe("require", function() {
		it("plugins respect the same node.js behavior", async function() {
			const pluginSourcePath = path.join(__dirname, "my-test-plugin");
			const pluginInfo = await manager.installFromPath(pluginSourcePath);

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
	});

	describe("plugins dependencies", function() {
		it("dependencies are installed", async function() {
			const pluginSourcePath = path.join(__dirname, "my-plugin-with-dep");
			const pluginInfo = await manager.installFromPath(pluginSourcePath);

			assert.equal(manager.list().length, 2);
			assert.equal(manager.list()[0].name, "moment");
			assert.equal(manager.list()[1].name, "my-plugin-with-dep");
		});

		it("dependencies are available", async function() {
			const pluginSourcePath = path.join(__dirname, "my-plugin-with-dep");
			const pluginInfo = await manager.installFromPath(pluginSourcePath);

			const pluginInstance = manager.require("my-plugin-with-dep");
			assert.equal(pluginInstance.testMoment, "1981/10/06");
		});

		it("by default @types dependencies are not installed", async function() {
			const pluginSourcePath = path.join(__dirname, "my-plugin-with-dep");
			const pluginInfo = await manager.installFromPath(pluginSourcePath);

			for (const p of manager.list()) {
				assert.notEqual(p.name, "@types/express");
			}
		});

		it("dependencies installed in the host are not installed but are available", async function() {
			// debug package is already available in the host

			const pluginSourcePath = path.join(__dirname, "my-plugin-with-dep");
			const pluginInfo = await manager.installFromPath(pluginSourcePath);

			for (const p of manager.list()) {
				assert.notEqual(p.name, "debug");
			}
		});

		describe("Given some ignored dependencies", function() {
			beforeEach(function() {
				manager.options.ignoredDependencies = [/^@types\//, "moment"];
			});

			it("ignored dependencies are not installed", async function() {
				const pluginSourcePath = path.join(__dirname, "my-plugin-with-dep");
				const pluginInfo = await manager.installFromPath(pluginSourcePath);

				for (const p of manager.list()) {
					assert.notEqual(p.name, "moment");
				}
			});

			it("if the ignored dependencies is required the plugin will not be loaded", async function() {
				const pluginSourcePath = path.join(__dirname, "my-plugin-with-dep");
				const pluginInfo = await manager.installFromPath(pluginSourcePath);

				// expected to fail because moment is missing...
				try {
					const pluginInstance = manager.require("my-plugin-with-dep");
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

		describe("given a static dependencies", function() {
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
				const pluginInfo = await manager.installFromPath(pluginSourcePath);

				assert.equal(manager.list().length, 1);
				assert.equal(manager.list()[0].name, "my-plugin-with-dep");

				const pluginInstance = manager.require("my-plugin-with-dep");
				assert.equal(pluginInstance.testMoment, "this is moment stub");
			});
		});
	});

	describe("npm registry", function() {
		it("get latest version info", async function() {
			const info = await manager.getInfoFromNpm("lodash");
			assert.equal("lodash", info.name);
			assert.isDefined(info.version);
		});

		it("get specific verison info", async function() {
			let info = await manager.getInfoFromNpm("lodash", "4.17.4");
			assert.equal("lodash", info.name);
			assert.equal("4.17.4", info.version);

			info = await manager.getInfoFromNpm("lodash", "=4.17.4");
			assert.equal("lodash", info.name);
			assert.equal("4.17.4", info.version);
		});

		it("get caret verison range info", async function() {
			const info = await manager.getInfoFromNpm("lodash", "^3.0.0");
			assert.equal("lodash", info.name);
			assert.equal("3.10.1", info.version); // this test can fail if lodash publish a 3.x version
		});

		it("get latest version info for scoped packages", async function() {
			const info = await manager.getInfoFromNpm("@types/node");
			assert.equal("@types/node", info.name);
			assert.isDefined(info.version);
		});

		it("get specific version info for scoped packages", async function() {
			let info = await manager.getInfoFromNpm("@types/node", "7.0.13");
			assert.equal("@types/node", info.name);
			assert.equal("7.0.13", info.version);

			info = await manager.getInfoFromNpm("@types/node", "=7.0.13");
			assert.equal("@types/node", info.name);
			assert.equal("7.0.13", info.version);
		});

		it("get caret version range info for scoped packages", async function() {
			const info = await manager.getInfoFromNpm("@types/node", "^6.0.0");
			assert.equal("@types/node", info.name);
			assert.equal("6.0.88", info.version); // this test can fail if @types/node publish a 6.x version
		});
	});
});
