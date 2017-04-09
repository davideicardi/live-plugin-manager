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
        const filePathExtension = path.extname(filePath).toLowerCase();
        if (filePathExtension === ".js") {
            const sandbox = this.createModuleSandbox(pluginContext, filePath);
            const moduleContext = vm.createContext(sandbox);
            const code = fs.readFileSync(filePath, "utf8");
            // For performance reasons wrap code in a Immediately-invoked function expression
            // https://60devs.com/executing-js-code-with-nodes-vm-module.html
            const iifeCode = `(function () {${code}}());`;
            const vmOptions = { displayErrors: true, filename: filePath };
            const script = new vm.Script(iifeCode, vmOptions);
            script.runInContext(moduleContext, vmOptions);
            moduleInstance = sandbox.module.exports;
        }
        else if (filePathExtension === ".json") {
            moduleInstance = fs.readJsonSync(filePath);
        }
        else {
            throw new Error("Invalid javascript file " + filePath);
        }
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
        // see https://nodejs.org/api/globals.html
        moduleSandbox.global = global; // TODO this is the real global object, it is fine to do this?
        moduleSandbox.Buffer = Buffer;
        moduleSandbox.console = console; // TODO Maybe I can override the console ??
        moduleSandbox.clearImmediate = clearImmediate;
        moduleSandbox.clearInterval = clearInterval;
        moduleSandbox.clearTimeout = clearTimeout;
        moduleSandbox.setImmediate = setImmediate;
        moduleSandbox.setInterval = setInterval;
        moduleSandbox.setTimeout = setTimeout;
        moduleSandbox.process = process;
        moduleSandbox.module = { exports: {} };
        moduleSandbox.exports = moduleSandbox.module.exports;
        moduleSandbox.__dirname = path.dirname(filePath);
        moduleSandbox.__filename = filePath;
        moduleSandbox.require = function (name) {
            return me.sandboxRequire(pluginContext, moduleSandbox.__dirname, name);
        };
        return moduleSandbox;
    }
    sandboxResolve(pluginContext, moduleDirName, name) {
        // I try to use a similar logic of https://nodejs.org/api/modules.html#modules_modules
        // is a relative module
        if (name.startsWith(".")
            || name.startsWith(path.sep)) {
            const fullPath = path.normalize(path.join(moduleDirName, name));
            // for security reason check to not load external files
            if (!fullPath.startsWith(pluginContext.location)) {
                throw new Error("Cannot require a module outside a plugin");
            }
            const isFile = this.tryResolveAsFile(fullPath);
            if (isFile) {
                return isFile;
            }
            const isDirectory = this.tryResolveAsDirectory(fullPath);
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
        return name;
    }
    sandboxRequire(pluginContext, moduleDirName, name) {
        // I try to use a similar logic of https://nodejs.org/api/modules.html#modules_modules
        debug(`Requiring ${name}`);
        const fullName = this.sandboxResolve(pluginContext, moduleDirName, name);
        // is a file or directory
        if (fullName.indexOf(path.sep) >= 0) {
            debug(`Resolved ${name} as ${fullName} file`);
            return this.load(pluginContext, fullName);
        }
        if (this.isPlugin(name)) {
            debug(`Resolved ${name} as ${fullName} plugin`);
            return this.manager.require(name);
        }
        if (this.isCoreModule(name)) {
            debug(`Resolved ${name} as ${fullName} core module`);
            return require(name);
        }
        if (this.manager.options.hostRequire) {
            debug(`Resolved ${name} as ${fullName} host module`);
            return this.manager.options.hostRequire(name);
        }
        throw new Error(`Module ${name} not found, failed to load plugin ${pluginContext.name}`);
    }
    isCoreModule(name) {
        return this.manager.options.requireCoreModules
            && require.resolve(name) === name;
    }
    isPlugin(name) {
        return !!this.manager.getInfo(name);
    }
    tryResolveAsFile(fullPath) {
        if (!fs.existsSync(fullPath)) {
            const isJs = this.tryResolveAsFile(fullPath + ".js");
            if (isJs) {
                return isJs;
            }
            const isJson = this.tryResolveAsFile(fullPath + ".json");
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
    tryResolveAsDirectory(fullPath) {
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