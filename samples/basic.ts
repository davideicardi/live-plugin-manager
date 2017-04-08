import {PluginManager} from "../index";
import * as path from "path";

const manager = new PluginManager({
	pluginsPath: path.join(__dirname, "plugins")
});

async function run() {
	await manager.installFromNpm("moment");
	await manager.installFromNpm("lodash", "4.17.4");

	const _ = manager.require("lodash");
	console.log(_.defaults({ a: 1 }, { a: 3, b: 2 })); // tslint:disable-line

	const moment = manager.require("moment");
	console.log(moment().format()); // tslint:disable-line

	await manager.uninstall("moment");
	await manager.uninstall("lodash");
}

run();
