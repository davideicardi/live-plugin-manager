import {PluginManager} from "../index";

const manager = new PluginManager();

async function run() {
	console.log("Installing express...");
	await manager.install("express", "4.16.2");
	console.log("Installing react...");
	await manager.install("react", "16.0.0");
	console.log("Installing react-dom...");
	await manager.install("react-dom", "16.0.0");

	const express = manager.require("express");
	const React = manager.require("react");
	const ReactDOMServer = manager.require("react-dom/server");

	const app = express();

	app.get("/", function(req: any, res: any) {

		class Hello extends React.Component {
			render() {
				return React.createElement("div", null, `Hello ${this.props.toWhat} from React!`);
			}
		}

		const elementToRender = React.createElement(Hello, {toWhat: "World"}, null);
		const reactResult = ReactDOMServer.renderToString(elementToRender);
		res.send(reactResult);
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
