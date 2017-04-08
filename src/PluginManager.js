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
const PluginVm_1 = require("./PluginVm");
const Debug = require("debug");
const debug = Debug("live-plugin-manager");
const BASE_NPM_URL = "https://registry.npmjs.org";
const cwd = process.cwd();
const DefaultOptions = {
    npmRegistryUrl: BASE_NPM_URL,
    sandbox: {},
    npmRegistryConfig: {},
    pluginsPath: path.join(cwd, "plugins"),
    requireCoreModules: true,
    requireFallback: undefined
};
class PluginManager {
    constructor(options) {
        this.installedPlugins = new Array();
        this.options = Object.assign({}, DefaultOptions, options || {});
        this.vm = new PluginVm_1.PluginVm(this);
        this.npmRegistry = new NpmRegistryClient_1.NpmRegistryClient(this.options.npmRegistryUrl, this.options.npmRegistryConfig);
    }
    installFromNpm(name, version = "latest") {
        return __awaiter(this, void 0, void 0, function* () {
            fs.ensureDirSync(this.options.pluginsPath);
            const registryInfo = yield this.npmRegistry.get(name, version);
            // already installed
            const installedInfo = this.getInfo(name);
            if (installedInfo && installedInfo.version === registryInfo.version) {
                return installedInfo;
            }
            // TODO check if already downloaded:
            //  if same version return
            // 	if different version uninstall it and continue
            const location = yield this.npmRegistry.download(this.options.pluginsPath, registryInfo);
            const pluginInfo = {
                name: normalizeName(registryInfo.name),
                version: registryInfo.version,
                mainFile: path.join(location, registryInfo.main),
                source: "npm",
                location
            };
            yield this.install(pluginInfo);
            return pluginInfo;
        });
    }
    installFromPath(location) {
        return __awaiter(this, void 0, void 0, function* () {
            fs.ensureDirSync(this.options.pluginsPath);
            const packageJsonFile = path.join(location, "package.json");
            if (!fs.existsSync(packageJsonFile)) {
                throw new Error(`Invalid plugin ${location}, package.json is missing`);
            }
            const packageJson = JSON.parse(fs.readFileSync(packageJsonFile, "utf8"));
            if (!packageJson.main
                || !packageJson.name
                || !packageJson.version) {
                throw new Error(`Invalid plugin ${location}, 'main', 'name' and 'version' properties are required in package.json`);
            }
            fs.copySync(location, this.options.pluginsPath);
            const pluginInfo = {
                name: normalizeName(packageJson.name),
                version: packageJson.version,
                mainFile: path.join(location, packageJson.main),
                source: "path",
                location
            };
            yield this.install(pluginInfo);
            return pluginInfo;
        });
    }
    uninstall(name) {
        return __awaiter(this, void 0, void 0, function* () {
            const info = this.getInfo(name);
            if (!info) {
                return;
            }
            const index = this.installedPlugins.indexOf(info);
            if (index >= 0) {
                this.installedPlugins.splice(index, 1);
            }
            yield this.unload(info);
            fs.removeSync(info.location);
        });
    }
    list() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.installedPlugins;
        });
    }
    require(name) {
        const info = this.getInfo(name);
        if (!info) {
            throw new Error(`${name} not installed`);
        }
        return info.instance;
    }
    getInfo(name) {
        name = normalizeName(name);
        return this.installedPlugins.find((p) => p.name === name);
    }
    load(plugin) {
        return __awaiter(this, void 0, void 0, function* () {
            plugin.instance = this.vm.load(plugin, plugin.mainFile);
        });
    }
    unload(plugin) {
        return __awaiter(this, void 0, void 0, function* () {
            plugin.instance = undefined;
        });
    }
    install(pluginInfo) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.load(pluginInfo);
            this.installedPlugins.push(pluginInfo);
        });
    }
}
exports.PluginManager = PluginManager;
function normalizeName(name) {
    if (!name) {
        throw new Error("Invalid plugin name");
    }
    return name.toLowerCase();
}
//# sourceMappingURL=PluginManager.js.map