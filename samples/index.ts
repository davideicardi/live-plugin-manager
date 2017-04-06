import {PluginManager} from "../index";
import * as path from "path";

const manager = new PluginManager({
	pluginsPath: path.join(__dirname, "plugins")
});

async function run() {
	await manager.install("forge-nodejs-sdk");
	await manager.install("jquery", "1.5.1");
}

run();
