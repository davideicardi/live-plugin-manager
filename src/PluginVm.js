"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vm = require("vm");
const fs = require("fs-extra");
const path = require("path");
const Debug = require("debug");
const debug = Debug("live-plugin-manager.PluginVm");
class PluginVm {
    constructor(manager) {
        this.manager = manager;
        this.requireCache = new Map();
    }
    load(pluginContext, filePath) {
        let moduleInstance = this.getCache(pluginContext, filePath);
        if (moduleInstance) {
            debug(`${filePath} loaded from cache`);
            return moduleInstance;
        }
        debug(`Loading ${filePath} ...`);
        if (path.extname(filePath) !== ".js") {
            throw new Error("Invalid javascript file " + filePath);
        }
        const sandbox = this.createModuleSandbox(pluginContext, filePath);
        const moduleContext = vm.createContext(sandbox);
        const code = fs.readFileSync(filePath, "utf8");
        const vmOptions = { displayErrors: true, filename: filePath };
        const script = new vm.Script(code, vmOptions);
        script.runInContext(moduleContext, vmOptions);
        moduleInstance = sandbox.module.exports;
        this.setCache(pluginContext, filePath, moduleInstance);
        return moduleInstance;
    }
    getCache(pluginContext, filePath) {
        const moduleCache = this.requireCache.get(pluginContext);
        if (!moduleCache) {
            return undefined;
        }
        return moduleCache.get(filePath);
    }
    setCache(pluginContext, filePath, instance) {
        let moduleCache = this.requireCache.get(pluginContext);
        if (!moduleCache) {
            moduleCache = new Map();
            this.requireCache.set(pluginContext, moduleCache);
        }
        moduleCache.set(filePath, instance);
    }
    createModuleSandbox(pluginContext, filePath) {
        const me = this;
        const moduleSandbox = Object.assign({}, this.manager.options.sandbox);
        moduleSandbox.global = global; // TODO this is the real global object, it is fine to do this?
        moduleSandbox.module = { exports: {} };
        moduleSandbox.exports = moduleSandbox.module.exports;
        moduleSandbox.__dirname = path.dirname(filePath);
        moduleSandbox.__filename = filePath;
        moduleSandbox.require = function (name) {
            return me.sandboxRequire(pluginContext, name);
        };
        return moduleSandbox;
    }
    sandboxResolve(pluginContext, name) {
        // I try to use a similar logic of https://nodejs.org/api/modules.html#modules_modules
        // is a relative module
        if (name.startsWith(".")
            || name.startsWith(path.sep)) {
            const fullPath = path.normalize(path.join(pluginContext.location, name));
            if (!fullPath.startsWith(pluginContext.location)) {
                throw new Error("Cannot require a module outside a plugin");
            }
            const isFile = this.tryLoadAsFile(pluginContext, fullPath);
            if (isFile) {
                return isFile;
            }
            const isDirectory = this.tryLoadAsDirectory(pluginContext, fullPath);
            if (isDirectory) {
                return isDirectory;
            }
            throw new Error(`Cannot find ${name} in plugin ${pluginContext.name}`);
        }
        if (this.isPlugin(name)) {
            return name;
        }
        if (this.isCoreModule(name)) {
            return name;
        }
        if (this.manager.options.requireFallback) {
            return this.manager.options.requireFallback.resolve(name);
        }
        throw new Error(`Cannot find ${name} in plugin ${pluginContext.name}`);
    }
    sandboxRequire(pluginContext, name) {
        // I try to use a similar logic of https://nodejs.org/api/modules.html#modules_modules
        const fullName = this.sandboxResolve(pluginContext, name);
        // is a file
        if (fullName.indexOf(path.sep) >= 0) {
            return this.load(pluginContext, fullName);
        }
        if (this.isPlugin(name)) {
            return this.manager.require(name);
        }
        if (this.isCoreModule(name)) {
            return require(name);
        }
        if (this.manager.options.requireFallback) {
            return this.manager.options.requireFallback(name);
        }
        throw new Error(`Cannot find ${name} in plugin ${pluginContext.name}`);
    }
    isCoreModule(name) {
        return this.manager.options.requireCoreModules
            && require.resolve(name) === name;
    }
    isPlugin(name) {
        return !!this.manager.getInfo(name);
    }
    tryLoadAsFile(pluginContext, fullPath) {
        if (!fs.existsSync(fullPath)) {
            const isJs = this.tryLoadAsFile(pluginContext, fullPath + ".js");
            if (isJs) {
                return isJs;
            }
            const isJson = this.tryLoadAsFile(pluginContext, fullPath + ".json");
            if (isJson) {
                return isJson;
            }
            return undefined;
        }
        const stats = fs.lstatSync(fullPath);
        if (!stats.isDirectory()) {
            return fullPath;
        }
        return undefined;
    }
    tryLoadAsDirectory(pluginContext, fullPath) {
        if (!fs.existsSync(fullPath)) {
            return undefined;
        }
        const indexJs = path.join(fullPath, "index.js");
        if (fs.existsSync(indexJs)) {
            return indexJs;
        }
        const indexJson = path.join(fullPath, "index.json");
        if (fs.existsSync(indexJson)) {
            return indexJson;
        }
        return undefined;
    }
}
exports.PluginVm = PluginVm;
//# sourceMappingURL=PluginVm.js.map