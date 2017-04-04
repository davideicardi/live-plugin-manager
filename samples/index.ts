import {PluginManager} from "../index";
import * as path from "path";

const manager = new PluginManager({
	pluginsDirectory: path.join(__dirname, ".plugins")
});

manager.install("https://registry.npmjs.org/forge-nodejs-sdk/-/forge-nodejs-sdk-4.3.1.tgz");
