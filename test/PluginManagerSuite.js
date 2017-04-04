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
const chai_1 = require("chai");
const path = require("path");
const fs = require("fs-extra");
const index_1 = require("../index");
const pluginsDirectory = path.join(__dirname, "test-plugins");
describe("PluginManager suite", () => {
    let manager;
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        fs.removeSync(pluginsDirectory);
        manager = new index_1.PluginManager({
            pluginsDirectory
        });
    }));
    afterEach(() => __awaiter(this, void 0, void 0, function* () {
        fs.removeSync(pluginsDirectory);
    }));
    it("should not have any installed plugins", () => __awaiter(this, void 0, void 0, function* () {
        const plugins = yield manager.list();
        chai_1.assert.equal(plugins.length, 0);
    }));
    describe("when installing a plugin using npm url", () => {
        beforeEach(() => __awaiter(this, void 0, void 0, function* () {
            yield manager.install("https://registry.npmjs.org/lodash/-/lodash-4.17.4.tgz");
        }));
        it("should be available", () => __awaiter(this, void 0, void 0, function* () {
            const plugins = yield manager.list();
            chai_1.assert.equal(plugins.length, 1);
            chai_1.assert.equal(plugins[0].id, "lodash");
            chai_1.assert.equal(plugins[0].version, "4.17.4");
            const _ = yield manager.get("lodash");
            chai_1.assert.isDefined(_);
            // try to use the plugin
            const result = _.defaults({ a: 1 }, { a: 3, b: 2 });
            chai_1.assert.equal(result.a, 1);
            chai_1.assert.equal(result.b, 2);
        }));
    });
});
//# sourceMappingURL=PluginManagerSuite.js.map