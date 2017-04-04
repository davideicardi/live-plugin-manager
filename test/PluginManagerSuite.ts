import { assert } from "chai";
import * as path from "path";
import * as fs from "fs-extra";

import {PluginManager} from "../index";

const pluginsDirectory = path.join(__dirname, "test-plugins");

describe("PluginManager suite", () => {
	let manager: PluginManager;

	beforeEach(async () => {
		fs.removeSync(pluginsDirectory);
		manager = new PluginManager({
			pluginsDirectory
		});
	});

	afterEach(async () => {
		fs.removeSync(pluginsDirectory);
	});

	it("should not have any installed plugins", async () => {
		const plugins = await manager.list();
		assert.equal(plugins.length, 0);
	});

	describe("when installing a plugin using npm url", () => {
		beforeEach(async () => {
			await manager.install("https://registry.npmjs.org/lodash/-/lodash-4.17.4.tgz");
		});

		it("should be available", async () => {
			const plugins = await manager.list();
			assert.equal(plugins.length, 1);
			assert.equal(plugins[0].id, "lodash");
			assert.equal(plugins[0].version, "4.17.4");

			const _ = await manager.get("lodash");
			assert.isDefined(_);

			// try to use the plugin
			const result = _.defaults({ a: 1 }, { a: 3, b: 2 });
			assert.equal(result.a, 1);
			assert.equal(result.b, 2);
		});
	});
});
