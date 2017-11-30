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
    unload(pluginContext) {
        this.requireCache.delete(pluginContext);
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
            const code = fs.readFileSync(filePath, "utf8");
            moduleInstance = this.vmRunScript(pluginContext, filePath, code);
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
    resolve(pluginContext, filePath) {
        return this.sandboxResolve(pluginContext, pluginContext.location, filePath);
    }
    runScript(code) {
        const name = "dynamic-" + Date.now;
        const filePath = path.join(this.manager.options.pluginsPath, name + ".js");
        const pluginContext = {
            location: path.join(this.manager.options.pluginsPath, name),
            mainFile: filePath,
            name,
            version: "1.0.0",
            dependencies: {}
        };
        return this.vmRunScript(pluginContext, filePath, code);
    }
    splitRequire(fullName) {
        const slashPosition = fullName.indexOf("/");
        let requiredPath;
        let pluginName = fullName;
        if (slashPosition > 0) {
            pluginName = fullName.substring(0, slashPosition);
            requiredPath = "." + fullName.substring(slashPosition);
        }
        return { pluginName, requiredPath };
    }
    vmRunScript(pluginContext, filePath, code) {
        const sandbox = this.createModuleSandbox(pluginContext, filePath);
        const moduleContext = vm.createContext(sandbox);
        // For performance reasons wrap code in a Immediately-invoked function expression
        // https://60devs.com/executing-js-code-with-nodes-vm-module.html
        // I have also declared the exports variable to support the
        //  `var app = exports = module.exports = {};` notation
        const newLine = "\r\n";
        const iifeCode = `(function(exports){${newLine}${code}${newLine}}(module.exports));`;
        const vmOptions = { displayErrors: true, filename: filePath };
        const script = new vm.Script(iifeCode, vmOptions);
        script.runInContext(moduleContext, vmOptions);
        return sandbox.module.exports;
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
        const pluginGlobalSource = this.manager.options.sandbox.global || global;
        // https://nodejs.org/api/globals.html
        const moduleSandbox = Object.assign({}, pluginGlobalSource, { 
            // other "not real global" objects
            module: { exports: {} }, __dirname: path.dirname(filePath), __filename: filePath, require: (requiredName) => {
                return this.sandboxRequire(pluginContext, moduleSandbox.__dirname, requiredName);
            } });
        // override the global obj to "unlink" it from the original global obj
        //  and make it unique for each plugin
        moduleSandbox.global = moduleSandbox;
        // override env
        if (this.manager.options.sandbox.env) {
            moduleSandbox.process.env = Object.assign({}, this.manager.options.sandbox.env); // clone obj
        }
        return moduleSandbox;
    }
    sandboxResolve(pluginContext, moduleDirName, requiredName) {
        // I try to use a similar logic of https://nodejs.org/api/modules.html#modules_modules
        // is a relative module
        if (requiredName.startsWith(".")) {
            const fullPath = path.normalize(path.join(moduleDirName, requiredName));
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
            throw new Error(`Cannot find ${requiredName} in plugin ${pluginContext.name}`);
        }
        if (this.isPlugin(requiredName)) {
            return requiredName;
        }
        if (this.manager.options.staticDependencies[requiredName]) {
            return requiredName;
        }
        // this will fail if module is unknown
        if (this.isCoreModule(requiredName)) {
            return requiredName;
        }
        return requiredName;
    }
    sandboxRequire(pluginContext, moduleDirName, requiredName) {
        // I try to use a similar logic of https://nodejs.org/api/modules.html#modules_modules
        debug(`Requiring '${requiredName}'...`);
        const fullName = this.sandboxResolve(pluginContext, moduleDirName, requiredName);
        // is an absolute file or directory that can be loaded
        if (path.isAbsolute(fullName)) {
            debug(`Resolved ${requiredName} as file ${fullName}`);
            return this.load(pluginContext, fullName);
        }
        if (this.manager.options.staticDependencies[requiredName]) {
            debug(`Resolved ${requiredName} as static dependency`);
            return this.manager.options.staticDependencies[requiredName];
        }
        if (this.isPlugin(requiredName)) {
            debug(`Resolved ${requiredName} as plugin`);
            return this.manager.require(requiredName);
        }
        if (this.isCoreModule(requiredName)) {
            debug(`Resolved ${requiredName} as core module`);
            return require(requiredName);
        }
        if (this.manager.options.hostRequire) {
            debug(`Resolved ${requiredName} as host module`);
            return this.manager.options.hostRequire(requiredName);
        }
        throw new Error(`Module ${requiredName} not found, failed to load plugin ${pluginContext.name}`);
    }
    isCoreModule(requiredName) {
        return this.manager.options.requireCoreModules
            && require.resolve(requiredName) === requiredName;
    }
    isPlugin(requiredName) {
        const { pluginName } = this.splitRequire(requiredName);
        return !!this.manager.getInfo(pluginName);
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