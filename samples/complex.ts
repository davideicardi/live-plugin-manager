// tslint:disable:no-console

import {PluginManager} from "../index";

const manager = new PluginManager();

async function run() {
	await manager.install("forge-nodejs-sdk");
	const _ = manager.require("forge-nodejs-sdk");
}

run();
