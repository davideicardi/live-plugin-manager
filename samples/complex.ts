// tslint:disable:no-console

import {PluginManager} from "../index";

const manager = new PluginManager();

async function run() {
	await manager.install("forge-nodejs-sdk");
	manager.require("forge-nodejs-sdk");
	console.log("ok");
}

run();
