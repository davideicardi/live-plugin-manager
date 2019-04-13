// tslint:disable:no-console

import {PluginManager} from "../src/index";

const manager = new PluginManager();

async function run() {
	await manager.install("moment");
	await manager.install("lodash", "4.17.4");

	const _ = manager.require("lodash");
	console.log(_.defaults({ a: 1 }, { a: 3, b: 2 }));

	const moment = manager.require("moment");
	console.log(moment().format());

	await manager.uninstall("moment");
	await manager.uninstall("lodash");
}

run();
