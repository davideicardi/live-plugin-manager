/* tslint:disable no-console */
import {PluginManager} from "../index";
import * as path from "path";

const manager = new PluginManager({
	pluginsPath: path.join(__dirname, "plugins")
});

async function run() {
	console.log("Installing express...");
	await manager.installFromNpm("express");

	const express = manager.require("express");

	const app = express();

	app.get("/", function(req: any, res: any) {
		res.send("Hello World!");
	});

	const server = app.listen(3000, function() {
		console.log("Example app listening on port 3000, closing after 20 secs.!");
	});

	setTimeout(async () => {
		server.close();
		console.log("Uninstalling plugins...");
		await manager.uninstallAll();
	}, 20000);
}

run()
.catch(console.error.bind(console));
