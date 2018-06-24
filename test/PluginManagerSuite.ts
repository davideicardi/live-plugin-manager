import { assert } from "chai"; // tslint:disable-line:no-implicit-dependencies
import * as path from "path";
import * as fs from "fs-extra";
import * as os from "os";
import * as semver from "semver";

import {PluginManager, IPluginInfo} from "../index";

// TODO To test installation of different version of the same plugin


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

		await fs.remove(manager.options.pluginsPath);
	});

	afterEach(async function() {
		await fs.remove(manager.options.pluginsPath);
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

			it("installing from a not valid npm url", async function() {
				manager = new PluginManager({
					npmRegistryUrl: "http://www.davideicardi.com/some-not-existing-registry/"
				});
				try {
					await manager.installFromNpm("moment");
				} catch (e) {
					return;
				}

				throw new Error("Expected to throw");
			});

			it("installing from a not valid npm url (with a redirect)", async function() {
				manager = new PluginManager({
					// NOTE: I assume that davideicardi.com redirect to www.davideicardi.com
					npmRegistryUrl: "http://davideicardi.com/some-not-existing-registry/"
				});
				try {
					await manager.installFromNpm("moment");
				} catch (e) {
					return;
				}

				throw new Error("Expected to throw");
			});

			it("installing a not existing plugin", async function() {
				try {
					await manager.installFromNpm("this-does-not-exists", "9.9.9");
				} catch (e) {
					return;
				}

				throw new Error("Expected to throw");
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

			it("installing a plugin already present in the folder will succeeded also if npm is down", async function() {
				// download it to ensure it is present
				await manager.installFromNpm("cookie", "0.3.1");

				const failedManager = new PluginManager({
					npmRegistryUrl: "http://davideicardi.com/some-not-existing-registry/"
				});

				await failedManager.installFromNpm("cookie", "0.3.1");

				const cookie = manager.require("cookie");
				assert.isDefined(cookie, "Plugin is not loaded");

				// try to use the plugin
				const result = cookie.parse("foo=bar;x=y");
				assert.equal(result.foo, "bar");
				assert.equal(result.x, "y");
			});

			// tslint:disable-next-line:max-line-length
			it("installing a plugin already present in the folder will fail if npm is down and noCache is used", async function() {
				// download it to ensure it is present
				await manager.installFromNpm("cookie", "0.3.1");

				const failedManager = new PluginManager({
					npmRegistryUrl: "http://davideicardi.com/some-not-existing-registry/",
					npmInstallMode: "noCache"
				});

				try {
					await failedManager.installFromNpm("cookie", "0.3.1");
				} catch (e) {
					return;
				}

				throw new Error("Expected to throw");
			});

			// tslint:disable-next-line:max-line-length
			it("installing a plugin already present in the folder will fail if npm is down and I ask for latest", async function() {
				// download it to ensure it is present
				await manager.installFromNpm("cookie", "0.3.1");

				const failedManager = new PluginManager({
					npmRegistryUrl: "http://davideicardi.com/some-not-existing-registry/"
				});

				try {
					await failedManager.installFromNpm("cookie");
				} catch (e) {
					return;
				}

				throw new Error("Expected to throw");
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

			describe("given a plugin with an unknown dependency", function() {
				beforeEach(async function() {
					const code = `module.exports = require("some-not-valid-dependency");`;
					await manager.installFromCode("my-code-plugin", code);
				});

				it("should give an error on require", async function() {
					try {
						manager.require("my-code-plugin");
					} catch (e) {
						return;
					}
					throw new Error("Expected to fail");
				});

				it("after a failed require it shold fail also for next require", async function() {
					// there was a bug that cache a failed plugin also on error
					for (let i = 0; i < 10; i++) {
						try {
							manager.require("my-code-plugin");
						} catch (e) {
							continue;
						}
						throw new Error("Expected to fail");
					}
				});
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

		// TODO review this test, split it in microtest
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

			// NOTE: process is not equal because I copy it to override vars
			// assert.equal(pluginInstance.myGlobals.process, process);

			assert.equal(pluginInstance.myGlobals.console, console);
			assert.equal(pluginInstance.myGlobals.clearImmediate, clearImmediate);
			assert.equal(pluginInstance.myGlobals.clearInterval, clearInterval);
			assert.equal(pluginInstance.myGlobals.clearTimeout, clearTimeout);
			assert.equal(pluginInstance.myGlobals.setImmediate, setImmediate);
			assert.equal(pluginInstance.myGlobals.setInterval, setInterval);
			assert.equal(pluginInstance.myGlobals.setTimeout, setTimeout);
			assert.equal(pluginInstance.myGlobals.Buffer, Buffer);
		});

		it("require absolute files", async function() {
			const pluginSourcePath = path.join(__dirname, "my-plugin-with-abs-require");
			await manager.installFromPath(pluginSourcePath);

			const pluginInstance = manager.require("my-plugin-with-abs-require");
			assert.isDefined(pluginInstance, "Plugin is not loaded");

			assert.equal(pluginInstance.myVariableFromAbsoluteFile, "value3");
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

		it("installing a plugin with folder as main", async function() {
			const pluginPath = path.join(__dirname, "my-plugin-with-folder-as-main");
			await manager.installFromPath(pluginPath);

			const pluginInstance = manager.require("my-plugin-with-folder-as-main");
			assert.isDefined(pluginInstance, "Plugin is not loaded");

			assert.equal(pluginInstance.myVariable, "value1");
		});

		it("installing a plugin with a circular reference in require", async function() {
			const pluginPath = path.join(__dirname, "my-plugin-with-circular-reference");
			await manager.installFromPath(pluginPath);

			const pluginInstance = manager.require("my-plugin-with-circular-reference");
			assert.isDefined(pluginInstance, "Plugin is not loaded");

			assert.equal(pluginInstance.myVariable, "value1");
		});

		it("file should wins over folder with the same name", async function() {
			const pluginPath = path.join(__dirname, "my-plugin-file-win-over-folder");
			await manager.installFromPath(pluginPath);

			const pluginInstance = manager.require("my-plugin-file-win-over-folder");
			assert.isDefined(pluginInstance, "Plugin is not loaded");

			assert.equal(pluginInstance, "i-am-the-file");
		});

	});

	describe("scoped plugins", function() {
		it("installing a scoped plugin", async function() {
			const pluginPath = path.join(__dirname, "my-basic-plugin-scoped");
			await manager.installFromPath(pluginPath);

			const pluginInstance = manager.require("@myscope/my-basic-plugin-scoped");
			assert.isDefined(pluginInstance, "Plugin is not loaded");

			assert.equal(pluginInstance.myVariable, "value1");
		});

		it("installing a scoped plugin with path", async function() {
			const pluginPath = path.join(__dirname, "my-basic-plugin-scoped");
			await manager.installFromPath(pluginPath);

			const pluginInstance = manager.require("@myscope/my-basic-plugin-scoped/index.js");
			assert.isDefined(pluginInstance, "Plugin is not loaded");

			assert.equal(pluginInstance.myVariable, "value1");
		});
	});

	describe("plugins dependencies", function() {
		this.slow(6000);

		describe("Npm dependencies", function() {

			describe("Given a package with npm dependencies", function() {
				beforeEach(async function() {
					const pluginSourcePath = path.join(__dirname, "my-plugin-with-dep");
					await manager.installFromPath(pluginSourcePath);
				});

				it("dependencies are installed", async function() {
					assert.equal(manager.list().length, 2);
					assert.equal(manager.list()[0].name, "moment");
					assert.equal(manager.list()[1].name, "my-plugin-with-dep");
				});

				it("dependencies are available", async function() {
					const pluginInstance = manager.require("my-plugin-with-dep");

					assert.equal(pluginInstance.testDebug, require("debug")); // I expect to be exactly the same
					assert.equal(pluginInstance.testMoment, "1981/10/06");
				});

				it("by default @types dependencies are not installed", async function() {
					for (const p of manager.list()) {
						assert.notEqual(p.name, "@types/express");
					}
				});

				it("dependencies installed in the host are not installed but are available", async function() {
					// debug package is already available in the host

					for (const p of manager.list()) {
						assert.notEqual(p.name, "debug");
					}
				});

				describe("uninstalling a dependency (moment)", function() {
					beforeEach(async function() {
						await manager.uninstall("moment");
					});

					it("requiring the plugin will fail", function() {
						try {
							manager.require("my-plugin-with-dep");
						} catch (e) {
							return;
						}

						throw new Error("Excepted to fail");
					});

					it("if dependency is reinstalled plugin will work again", async function() {
						await manager.installFromNpm("moment", "2.18.1");

						const pluginInstance = manager.require("my-plugin-with-dep");

						assert.equal(pluginInstance.testMoment, "1981/10/06");
					});

					it("after a plugin load error if dependency is reinstalled plugin will work again", async function() {
						let initialFailed = false;
						try {
							manager.require("my-plugin-with-dep");
						} catch (e) {
							initialFailed = true;
						}
						assert.isTrue(initialFailed, "expected to fail to load without moment");

						await manager.installFromNpm("moment", "2.18.1");

						const pluginInstance = manager.require("my-plugin-with-dep");

						assert.equal(pluginInstance.testMoment, "1981/10/06");
					});
				});
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

			it("updating a package that need a prev version will not downgrade the dependency", async function() {
				await manager.installFromPath(path.join(__dirname, "my-plugin-a@v2")); // update dependency to v2

				await manager.uninstall("my-plugin-b");
				await manager.installFromPath(path.join(__dirname, "my-plugin-b")); // depend on my-plugin-a@1.0.0

				assert.equal(manager.list().length, 2);
				assert.equal(manager.list()[0].name, "my-plugin-a");
				assert.equal(manager.list()[0].version, "2.0.0");
				assert.equal(manager.list()[1].name, "my-plugin-b");
				const initialPluginInstance = manager.require("my-plugin-b");
				assert.equal(initialPluginInstance, "a = v2");
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

		describe("Not compatible dependencies with host", function() {

			// Note: Assume that host contains "debug" npm package at version 3

			it("dependencies are installed", async function() {
				// this package contains "debug" at version 2 (different from the host)
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

			it("dependencies is not the same", async function() {
				const pluginSourcePath = path.join(__dirname, "my-plugin-with-diff-dep");
				await manager.installFromPath(pluginSourcePath);

				const pluginDebugInstance = manager.require("debug/package.json");
				// tslint:disable-next-line:no-submodule-imports
				const hostDebugInstance = require("debug/package.json");

				assert.equal(pluginDebugInstance.version, "2.6.9");
				assert.equal(hostDebugInstance.version.substring(0, 1), "3");

				assert.notEqual(pluginDebugInstance.version, hostDebugInstance.version); // I expect to be different (v2 vs v3)
			});
		});

		describe("given an host dependency", function() {
			const hostDependencyDestPath = path.join(__dirname, "..", "node_modules", "host-dependency");

			// given a dependency installed in the host
			// with version 1
			// note: I simulate an host dependency by manually copy it in the node_modules folder
			before(async function() {
				const hostDependencySourcePath = path.join(__dirname, "host-dependency@v1");
				await fs.copy(hostDependencySourcePath, hostDependencyDestPath);
			});

			after(async function() {
				await fs.remove(hostDependencyDestPath);
			});

			it("it can be resolved", function() {
				// tslint:disable-next-line:no-implicit-dependencies
				const dependency = require("host-dependency");
				assert.isDefined(dependency);
				assert.equal(dependency, "v1.0.0");
				// tslint:disable-next-line:no-implicit-dependencies no-submodule-imports
				const dependencyPackage = require("host-dependency/package.json");
				assert.equal(dependencyPackage.version, "1.0.0");
			});

			describe("when installing plugin that depends on the host dependency", function() {
				beforeEach(async function() {
					// this package depends on "host-dependency" at version ^1.0.0
					const pluginSourcePath = path.join(__dirname, "my-plugin-with-host-dep");
					await manager.installFromPath(pluginSourcePath);
				});

				it("dependency is not installed because already installed in host", function() {
					assert.equal(manager.list().length, 1);
					assert.equal(manager.list()[0].name, "my-plugin-with-host-dep");
				});

				it("it is resolved using the host dependency", function() {
					const pluginInstance = manager.require("my-plugin-with-host-dep");
					assert.isDefined(pluginInstance);

					// tslint:disable-next-line:no-implicit-dependencies
					assert.equal(pluginInstance.testHostDependency, require("host-dependency"));

					assert.equal(pluginInstance.testHostDependency, "v1.0.0");
				});

				describe("when installing an update of the host dependency", function() {
					beforeEach(async function() {
						const pluginSourcePath = path.join(__dirname, "host-dependency@v1.0.1");
						await manager.installFromPath(pluginSourcePath);
					});

					it("dependency is installed/updated", function() {
						assert.equal(manager.list().length, 2);
						assert.equal(manager.list()[0].name, "my-plugin-with-host-dep");
						assert.equal(manager.list()[1].name, "host-dependency");
						assert.equal(manager.list()[1].version, "1.0.1");
					});

					it("the updated dependency is now used by all dependants", function() {
						const pluginInstance = manager.require("my-plugin-with-host-dep");
						assert.isDefined(pluginInstance);

						// tslint:disable-next-line:no-implicit-dependencies
						assert.notEqual(pluginInstance.testHostDependency, require("host-dependency"));

						assert.equal(pluginInstance.testHostDependency, "v1.0.1");
					});

					describe("when uninstalling the update", function() {
						beforeEach(async function() {
							await manager.uninstall("host-dependency");
						});

						it("dependency is uninstalled", function() {
							assert.equal(manager.list().length, 1);
							assert.equal(manager.list()[0].name, "my-plugin-with-host-dep");
						});

						it("it is again resolved using the host dependency", function() {
							const pluginInstance = manager.require("my-plugin-with-host-dep");
							assert.isDefined(pluginInstance);

							// tslint:disable-next-line:no-implicit-dependencies
							assert.equal(pluginInstance.testHostDependency, require("host-dependency"));

							assert.equal(pluginInstance.testHostDependency, "v1.0.0");
						});
					});
				});
			});
		});

		describe("when there are conflict between plugin's dependencies", function() {
			it("each plugin will install a specific version", async function() {
				const plugin1 = path.join(__dirname, "my-plugin-with-conflict-dep1");
				await manager.installFromPath(plugin1);

				const plugin2 = path.join(__dirname, "my-plugin-with-conflict-dep2");
				await manager.installFromPath(plugin2);

				assert.equal(manager.require("my-plugin-with-conflict-dep1"),
					"my-plugin-with-conflict-dep1 loaded debug@v2.0.0");
				assert.equal(manager.require("my-plugin-with-conflict-dep2"),
					"my-plugin-with-conflict-dep2 loaded debug@v1.0.4");
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

		it("get latest version info (with undefined version)", async function() {
			const info = await manager.queryPackageFromNpm("lodash", undefined);
			assert.equal("lodash", info.name);
			assert.isDefined(info.version, "Version not defined");
		});

		it("get latest version info (with null version)", async function() {
			const info = await manager.queryPackageFromNpm("lodash", null as any);
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

			assert.isTrue(semver.gt(info.version, "6.0.0"), "Should get a version greater than 6.0.0");
			assert.isTrue(semver.lt(info.version, "7.0.0"), "Should get a version less than 7.0.0");
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
				// simulate unlock
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

	describe("sandbox", function() {
		describe("given globals variables", function() {
			it("unknown globals throw an exception", function() {
				const code = `module.exports = someUnknownGlobalVar;`;
				try {
					manager.runScript(code);
				} catch {
					return;
				}
				throw new Error("Excepted to fail");
			});

			it("globals are available", function() {
				const code = `module.exports = encodeURIComponent("test/1");`;
				const result = manager.runScript(code);
				assert.equal(result, encodeURIComponent("test/1"));
			});

			it("globals are inherited from host", function() {
				// Note: this is a bad practice (modify global...) but I support it
				(global as any).myCustomGlobalVar = "myCustomGlobalVar1";
				const code = `module.exports = myCustomGlobalVar`;
				const result = manager.runScript(code);
				assert.equal(result, "myCustomGlobalVar1");
			});

			it("globals can be overwritten from host", function() {
				(manager.options.sandbox.global as any) = {
					...global, // copy default global
					myCustomGlobalVar: "myCustomGlobalVar2"
				};
				const code = `module.exports = myCustomGlobalVar`;
				const result = manager.runScript(code);
				assert.equal(result, "myCustomGlobalVar2");
			});

			it("overwritten globals not affect host, is isolated", function() {
				assert.isUndefined((global as any).SOME_OTHER_KEY, "Initially host should not have it");

				manager.options.sandbox.global = {...global, SOME_OTHER_KEY: "test1" } as any;

				const code = `module.exports = SOME_OTHER_KEY;`;
				const result = manager.runScript(code);
				assert.equal(result, "test1");

				assert.isUndefined((global as any).SOME_OTHER_KEY, "Host should not inherit it");
			});
		});

		describe("given an environment variables", function() {

			beforeEach(function() {
				process.env.SOME_RANDOM_KEY = "test1";
			});

			afterEach(function() {
				delete process.env.SOME_RANDOM_KEY;
			});

			it("plugins inherit from host", function() {
				const code = `module.exports = process.env.SOME_RANDOM_KEY;`;

				const result = manager.runScript(code);
				assert.equal(result, "test1");
			});

			it("allow to override env from host", function() {
				manager.options.sandbox.env = { SOME_KEY: "test2" };

				const code = `module.exports = process.env.SOME_RANDOM_KEY;`;
				const result = manager.runScript(code);
				assert.isUndefined(result);

				const code2 = `module.exports = process.env.SOME_KEY;`;
				const result2 = manager.runScript(code2);
				assert.equal(result2, "test2");
			});

			it("overwritten env not affect host, is isolated", function() {
				assert.isUndefined(process.env.SOME_PLUGIN_KEY, "Initially host should not have it");

				manager.options.sandbox.env = { SOME_PLUGIN_KEY: "test2" };

				const code = `module.exports = process.env.SOME_PLUGIN_KEY;`;
				const result = manager.runScript(code);
				assert.equal(result, "test2");

				assert.isUndefined(process.env.SOME_PLUGIN_KEY, "Host should not inherit it");
			});
		});

		describe("sandbox specific for plugin", function() {

			it("set sandbox for a specific plugin", async function() {
				const code = `module.exports = process.env.SOME_RANDOM_KEY;`;

				await manager.installFromCode("my-plugin-with-sandbox", code);

				manager.setSandboxTemplate("my-plugin-with-sandbox", {
					env: {
						SOME_RANDOM_KEY: "test1"
					}
				});

				const result = manager.require("my-plugin-with-sandbox");
				assert.equal(result, "test1");
			});

			it("A plugin share the same globals between modules", async function() {
				const pluginSourcePath = path.join(__dirname, "my-plugin-env-global");
				await manager.installFromPath(pluginSourcePath);

				const result = manager.require("my-plugin-env-global");

				assert.equal(result, "Hello world!");
			});

			it("plugins not share global and env with host, is isolated", function() {
				assert.isUndefined(process.env.SOME_PLUGIN_KEY, "Initially host should not have it");
				assert.isUndefined((global as any).SOME_OTHER_KEY, "Initially host should not have it");

				const code = `
				global.SOME_OTHER_KEY = "test1";
				process.env.SOME_PLUGIN_KEY = "test2";
				module.exports = SOME_OTHER_KEY + process.env.SOME_PLUGIN_KEY;`;
				const result = manager.runScript(code);
				assert.equal(result, "test1test2");

				assert.isUndefined(process.env.SOME_PLUGIN_KEY, "Host should not inherit it");
				assert.isUndefined((global as any).SOME_OTHER_KEY, "Host should not have it");
			});
		});

		describe("NodeRequire object inside a plugin", function() {
			it("require system module", async function() {
				const code = `module.exports = require("fs");`;

				await manager.installFromCode("my-plugin-with-sandbox", code);

				const result = manager.require("my-plugin-with-sandbox");
				assert.equal(result, require("fs"));
			});

			it("require.resolve system module", async function() {
				const code = `module.exports = require.resolve("fs");`;

				await manager.installFromCode("my-plugin-with-sandbox", code);

				const result = manager.require("my-plugin-with-sandbox");
				assert.equal(result, require.resolve("fs"));
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

process.on("unhandledRejection", (reason, p) => {
	// tslint:disable-next-line:no-console
	console.log("Unhandled Rejection at: Promise", p, "reason:", reason.stack);
});
