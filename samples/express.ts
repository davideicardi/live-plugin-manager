import {PluginManager} from "../index";
import * as path from "path";

const manager = new PluginManager({
	pluginsPath: path.join(__dirname, "plugins")
});

async function run() {
	await manager.installFromNpm("express");

	const express = manager.require("express");

	const app = express();

	app.get("/", function(req: any, res: any) {
		res.send("Hello World!");
	});

	app.listen(3000, function() {
		console.log("Example app listening on port 3000!"); // tslint:disable-line
	});
}

run()
.catch(console.error.bind(console));
