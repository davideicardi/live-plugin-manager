import { assert } from "chai";
import * as path from "path";
import * as fs from "fs-extra";

import {PluginManager, PluginInfo} from "../index";

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

	it("installing a plugin using npm", async function() {
		const pluginInfo = await manager.installFromNpm("lodash", "4.17.4");

		const _ = manager.require("lodash");
		assert.isDefined(_, "Plugin is not loaded");

		// try to use the plugin
		const result = _.defaults({ a: 1 }, { a: 3, b: 2 });
		assert.equal(result.a, 1);
		assert.equal(result.b, 2);
	});

	describe("installing a plugin", function() {
		let pluginInfo: PluginInfo;

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

	it("dependencies of plugins are installed", async function() {
		const pluginSourcePath = path.join(__dirname, "my-plugin-with-dep");
		const pluginInfo = await manager.installFromPath(pluginSourcePath);

		const pluginInstance = manager.require("my-plugin-with-dep");
		assert.equal(pluginInstance, "1981/10/06");
	});
});
