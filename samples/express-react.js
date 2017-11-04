"use strict";
// tslint:disable:no-console
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../index");
const manager = new index_1.PluginManager();
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Installing express...");
        yield manager.install("express", "4.16.2");
        console.log("Installing react...");
        yield manager.install("react", "16.0.0");
        console.log("Installing react-dom...");
        yield manager.install("react-dom", "16.0.0");
        const express = manager.require("express");
        const React = manager.require("react");
        const ReactDOMServer = manager.require("react-dom/server");
        const app = express();
        app.get("/", function (req, res) {
            class Hello extends React.Component {
                render() {
                    return React.createElement("div", null, `Hello ${this.props.toWhat} from React!`);
                }
            }
            const elementToRender = React.createElement(Hello, { toWhat: "World" }, null);
            const reactResult = ReactDOMServer.renderToString(elementToRender);
            res.send(reactResult);
        });
        const server = app.listen(3000, function () {
            console.log("Example app listening on port 3000, closing after 20 secs.!");
        });
        setTimeout(() => __awaiter(this, void 0, void 0, function* () {
            server.close();
            console.log("Uninstalling plugins...");
            yield manager.uninstallAll();
        }), 20000);
    });
}
run()
    .catch(console.error.bind(console));
//# sourceMappingURL=express-react.js.map