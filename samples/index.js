"use strict";
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
const path = require("path");
const manager = new index_1.PluginManager({
    pluginsPath: path.join(__dirname, "plugins")
});
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        yield manager.installFromNpm("moment");
        yield manager.installFromNpm("jquery", "1.5.1");
        yield manager.uninstall("moment");
        yield manager.uninstall("jquery");
    });
}
run();
//# sourceMappingURL=index.js.map