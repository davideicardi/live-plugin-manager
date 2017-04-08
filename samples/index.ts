import {PluginManager} from "../index";
import * as path from "path";

const manager = new PluginManager({
	pluginsPath: path.join(__dirname, "plugins")
});

async function run() {
	await manager.installFromNpm("moment");
	await manager.installFromNpm("jquery", "1.5.1");


	await manager.uninstall("moment");
	await manager.uninstall("jquery");
}

run();
