import { assert } from "chai";
import * as path from "path";
import * as fs from "fs-extra";
import * as os from "os";

import {PluginManager, IPluginInfo} from "../index";

const pluginsPath = path.join(__dirname, "plugins");

describe("PluginManager suite", function() {
	this.timeout(15000);
	this.slow(3000);

	let manager: PluginManager;

	beforeEach(async function() {
		fs.removeSync(pluginsPath);
		manager = new PluginManager({
			pluginsPath
		});
	});

	afterEach(async function() {
		fs.removeSync(pluginsPath);
	});

	it("should not have any installed plugins", async function() {
		const plugins = await manager.list();
		assert.equal(plugins.length, 0);
	});

	it("installing a plugin from path", async function() {
		const pluginPath = path.join(__dirname, "my-basic-plugin");
		const pluginInfo = await manager.installFromPath(pluginPath);

		const pluginInstance = manager.require("my-basic-plugin");
		assert.isDefined(pluginInstance, "Plugin is not loaded");

		assert.equal(pluginInstance.myVariable, "value1");
	});

	it("installing a plugin with just required info", async function() {
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

	describe("installing a plugin", function() {
		let pluginInfo: IPluginInfo;

		beforeEach(async function() {
			pluginInfo = await manager.installFromNpm("lodash", "4.17.4");
		});

		it("should be available", async function() {
			const plugins = await manager.list();
			assert.equal(plugins.length, 1);
			assert.equal(plugins[0].name, "lodash");
			assert.equal(plugins[0].version, "4.17.4");
			assert.equal(plugins[0].location, path.join(pluginsPath, "lodash"));

			assert.isTrue(fs.existsSync(pluginInfo.location));

			const _ = manager.require("lodash");
			assert.isDefined(_, "Plugin is not loaded");

			assert.equal(manager.getInfo("lodash"), pluginInfo);
		});

		it("require always return the same instance", async function() {
			const instance1 = manager.require("lodash");
			const instance2 = manager.require("lodash");

			assert.equal(instance1, instance2);
		});

		it("dynamic script can require a plugin", async function() {
			const code = `
			const _ = require("lodash");

			module.exports = _;
			`;

			const result = manager.runScript(code);
			const instance = manager.require("lodash");

			assert.equal(instance, result);
		});

		describe("uninstalling", function() {
			beforeEach(async function() {
				await manager.uninstall("lodash");
			});

			it("should not be available anymore", async function() {
				const plugins = await manager.list();
				assert.equal(plugins.length, 0);

				assert.isFalse(fs.existsSync(pluginInfo.location), "Directory still exits");

				try {
					manager.require("lodash");
				} catch (e) {
					return;
				}

				throw new Error("Expected to fail");
			});

			it("requiring a not installed plugin", async function() {
				try {
					require("lodash");
				} catch (e) {
					return;
				}

				throw new Error("Expected to fail");
			});

			it("requiring a not installed plugin using it's path", async function() {
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

		assert.equal(pluginInstance.myGlobals.__filename, path.join(pluginsPath, "my-test-plugin", "index.js"));
		assert.equal(pluginInstance.myGlobals.__dirname, path.join(pluginsPath, "my-test-plugin"));
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

	describe("plugins dependencies", function() {
		it("dependencies are installed", async function() {
			const pluginSourcePath = path.join(__dirname, "my-plugin-with-dep");
			const pluginInfo = await manager.installFromPath(pluginSourcePath);

			assert.equal(manager.list()[0].name, "moment");
			assert.equal(manager.list()[1].name, "my-plugin-with-dep");

			const pluginInstance = manager.require("my-plugin-with-dep");
			assert.equal(pluginInstance, "1981/10/06");
		});

		it("ignored dependencies are not installed (@types)", async function() {
			const pluginSourcePath = path.join(__dirname, "my-plugin-with-dep");
			const pluginInfo = await manager.installFromPath(pluginSourcePath);

			assert.equal(manager.list().length, 2);

			assert.equal(manager.list()[0].name, "moment");
			assert.equal(manager.list()[1].name, "my-plugin-with-dep");
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

		it("get caret verison range info for scoped packages", async function() {
			const info = await manager.getInfoFromNpm("@types/node", "^6.0.0");
			assert.equal("@types/node", info.name);
			assert.equal("6.0.70", info.version); // this test can fail if @types/node publish a 6.x version
		});
	});
});
