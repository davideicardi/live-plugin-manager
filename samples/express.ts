import {PluginManager} from "../index";

const manager = new PluginManager();

async function run() {
	console.log("Installing express...");
	await manager.install("express", "4.16.2");

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
