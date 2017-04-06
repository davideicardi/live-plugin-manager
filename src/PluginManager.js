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
const fs = require("fs-extra");
const path = require("path");
const NpmRegistryClient_1 = require("./NpmRegistryClient");
const Debug = require("debug");
const debug = Debug("live-plugin-manager");
const BASE_NPM_URL = "https://registry.npmjs.org";
const cwd = process.cwd();
const DefaultOptions = {
    npmRegistryUrl: BASE_NPM_URL,
    npmRegistryConfig: {},
    pluginsPath: path.join(cwd, "plugins"),
};
class PluginManager {
    constructor(options) {
        this.installedPlugins = new Array();
        this.options = Object.assign({}, DefaultOptions, options || {});
        this.registryClient = new NpmRegistryClient_1.NpmRegistryClient(this.options.npmRegistryUrl, this.options.npmRegistryConfig);
    }
    install(name, version = "latest") {
        return __awaiter(this, void 0, void 0, function* () {
            fs.ensureDirSync(this.options.pluginsPath);
            const registryInfo = yield this.registryClient.get(name, version);
            // already installed
            const installedInfo = this.getInfo(name);
            if (installedInfo && installedInfo.version === registryInfo.version) {
                return;
            }
            // TODO check if already downloaded:
            //  if same version return
            // 	if different version uninstall it and continue
            yield this.registryClient.download(this.options.pluginsPath, registryInfo);
            this.installedPlugins.push({
                name: registryInfo.name.toLowerCase(),
                version: registryInfo.version,
                source: "npm"
            });
        });
    }
    uninstall(name) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO
        });
    }
    list() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.installedPlugins;
        });
    }
    get(name) {
        return __awaiter(this, void 0, void 0, function* () {
            const info = this.getInfo(name);
            if (!info) {
                throw new Error(`${name} not installed`);
            }
            return require(path.join(this.options.pluginsPath, info.name));
        });
    }
    getInfo(name) {
        name = name.toLowerCase();
        return this.installedPlugins.find((p) => p.name === name);
    }
}
exports.PluginManager = PluginManager;
class PluginInfo {
}
exports.PluginInfo = PluginInfo;
//# sourceMappingURL=PluginManager.js.map