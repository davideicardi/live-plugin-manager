import { assert } from "chai";
import * as path from "path";
import * as fs from "fs-extra";

import {PluginManager} from "../index";

const pluginsPath = path.join(__dirname, "test-plugins");

describe("PluginManager suite", () => {
	let manager: PluginManager;

	beforeEach(async () => {
		fs.removeSync(pluginsPath);
		manager = new PluginManager({
			pluginsPath
		});
	});

	afterEach(async () => {
		fs.removeSync(pluginsPath);
	});

	it("should not have any installed plugins", async () => {
		const plugins = await manager.list();
		assert.equal(plugins.length, 0);
	});

	describe("when installing a plugin using npm name", () => {
		beforeEach(async () => {
			await manager.install("lodash", "4.17.4");
		});

		it("should be available", async () => {
			const plugins = await manager.list();
			assert.equal(plugins.length, 1);
			assert.equal(plugins[0].name, "lodash");
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
