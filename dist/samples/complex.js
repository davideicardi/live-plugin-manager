"use strict";
// tslint:disable:no-console
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../index");
const manager = new index_1.PluginManager();
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        yield manager.install("forge-nodejs-sdk");
        manager.require("forge-nodejs-sdk");
        console.log("ok");
    });
}
run();
//# sourceMappingURL=complex.js.map