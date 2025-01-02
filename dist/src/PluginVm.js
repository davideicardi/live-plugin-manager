"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginVm = void 0;
const vm = __importStar(require("vm"));
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const console = __importStar(require("console"));
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)("live-plugin-manager.PluginVm");
const SCOPED_REGEX = /^(@[a-zA-Z0-9-_]+\/[a-zA-Z0-9-_]+)(.*)/;
class PluginVm {
    constructor(manager) {
        this.manager = manager;
        this.requireCache = new Map();
        this.sandboxCache = new Map();
    }
    unload(pluginContext) {
        this.requireCache.delete(pluginContext);
        this.sandboxCache.delete(pluginContext);
    }
    load(pluginContext, filePath) {
        let moduleInstance = this.getCache(pluginContext, filePath);
        if (moduleInstance) {
            if (debug.enabled) {
                debug(`${filePath} loaded from cache`);
            }
            return moduleInstance.exports;
        }
        if (debug.enabled) {
            debug(`Loading ${filePath} ...`);
        }
        const sandbox = this.createModuleSandbox(pluginContext, filePath);
        moduleInstance = sandbox.module;
        const filePathExtension = path.extname(filePath).toLowerCase();
        if (filePathExtension === ".js" || filePathExtension === ".cjs") {
            const code = fs.readFileSync(filePath, "utf8");
            // note: I first put the object (before executing the script) in cache to support circular require
            this.setCache(pluginContext, filePath, moduleInstance);
            try {
                this.vmRunScriptInSandbox(sandbox, filePath, code);
            }
            catch (e) {
                // in case of error remove the cache
                this.removeCache(pluginContext, filePath);
                throw e;
            }
        }
        else if (filePathExtension === ".json") {
            sandbox.module.exports = fs.readJsonSync(filePath);
            this.setCache(pluginContext, filePath, moduleInstance);
        }
        else {
            throw new Error("Invalid javascript file " + filePath);
        }
        moduleInstance.loaded = true;
        return moduleInstance.exports;
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
            dependencies: {},
            dependencyDetails: {}
        };
        try {
            return this.vmRunScriptInPlugin(pluginContext, filePath, code);
        }
        finally {
            this.unload(pluginContext);
        }
    }
    splitRequire(fullName) {
        const scopedInfo = this.getScopedInfo(fullName);
        if (scopedInfo) {
            return scopedInfo;
        }
        const slashPosition = fullName.indexOf("/");
        let requiredPath;
        let pluginName = fullName;
        if (slashPosition > 0) {
            pluginName = fullName.substring(0, slashPosition);
            requiredPath = "." + fullName.substring(slashPosition);
        }
        return { pluginName, requiredPath };
    }
    getScopedInfo(fullName) {
        const match = SCOPED_REGEX.exec(fullName);
        if (!match) {
            return undefined;
        }
        const requiredPath = match[2]
            ? "." + match[2]
            : undefined;
        return {
            pluginName: match[1],
            requiredPath
        };
    }
    vmRunScriptInSandbox(moduleSandbox, filePath, code) {
        const moduleContext = vm.createContext(moduleSandbox);
        // For performance reasons wrap code in a Immediately-invoked function expression
        // https://60devs.com/executing-js-code-with-nodes-vm-module.html
        // I have also declared the exports variable to support the
        //  `var app = exports = module.exports = {};` notation
        const iifeCode = `
			(function(exports){
				${code}
			}(module.exports));`;
        const vmOptions = { displayErrors: true, filename: filePath };
        const script = new vm.Script(iifeCode, vmOptions);
        script.runInContext(moduleContext, vmOptions);
    }
    vmRunScriptInPlugin(pluginContext, filePath, code) {
        const sandbox = this.createModuleSandbox(pluginContext, filePath);
        this.vmRunScriptInSandbox(sandbox, filePath, code);
        sandbox.module.loaded = true;
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
    removeCache(pluginContext, filePath) {
        const moduleCache = this.requireCache.get(pluginContext);
        if (!moduleCache) {
            return;
        }
        moduleCache.delete(filePath);
    }
    createModuleSandbox(pluginContext, filePath) {
        const pluginSandbox = this.getPluginSandbox(pluginContext);
        const moduleDirname = path.dirname(filePath);
        const moduleResolve = Object.assign((id) => {
            return this.sandboxResolve(pluginContext, moduleDirname, id);
        }, {
            paths: (_request) => null // TODO I should I populate this
        });
        const moduleRequire = Object.assign((requiredName) => {
            if (debug.enabled) {
                debug(`Requiring '${requiredName}' from ${filePath}...`);
            }
            return this.sandboxRequire(pluginContext, moduleDirname, requiredName);
        }, {
            resolve: moduleResolve,
            cache: {},
            extensions: {},
            main: require.main // TODO assign the real main or consider main the current module (ie. module)?
        });
        const myModule = {
            exports: {},
            filename: filePath,
            id: filePath,
            loaded: false,
            require: moduleRequire,
            paths: [],
            parent: module,
            children: [],
            path: moduleDirname,
            isPreloading: false
        };
        // assign missing https://nodejs.org/api/globals.html
        //  and other "not real global" objects
        const moduleSandbox = Object.assign(Object.assign({}, pluginSandbox), { module: myModule, __dirname: moduleDirname, __filename: filePath, require: moduleRequire });
        return moduleSandbox;
    }
    sandboxResolve(pluginContext, moduleDirName, requiredName) {
        // I try to use a similar logic of https://nodejs.org/api/modules.html#modules_modules
        // is a relative module or absolute path
        if (requiredName.startsWith(".") || path.isAbsolute(requiredName)) {
            const fullPath = path.resolve(moduleDirName, requiredName);
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
        if (this.hasDependency(pluginContext, requiredName)) {
            let fullPath = path.join(pluginContext.location, "node_modules", requiredName);
            if (!pluginContext.dependencyDetails) {
                throw new Error(`Dependencies not loaded for plugin ${pluginContext.name}`);
            }
            const packageJson = pluginContext.dependencyDetails[requiredName];
            if (!packageJson) {
                throw new Error(`${pluginContext.name} does not include ${requiredName} in local dependencies`);
            }
            if (packageJson.main) {
                fullPath = path.join(fullPath, packageJson.main);
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
        const fullName = this.sandboxResolve(pluginContext, moduleDirName, requiredName);
        // is an absolute file or directory that can be loaded
        if (path.isAbsolute(fullName)) {
            if (debug.enabled) {
                debug(`Resolved ${requiredName} as file ${fullName}`);
            }
            return this.load(pluginContext, fullName);
        }
        if (this.manager.options.staticDependencies[requiredName]) {
            if (debug.enabled) {
                debug(`Resolved ${requiredName} as static dependency`);
            }
            return this.manager.options.staticDependencies[requiredName];
        }
        if (this.isPlugin(requiredName)) {
            if (debug.enabled) {
                debug(`Resolved ${requiredName} as plugin`);
            }
            return this.manager.require(requiredName);
        }
        if (this.isCoreModule(requiredName)) {
            if (debug.enabled) {
                debug(`Resolved ${requiredName} as core module`);
            }
            return require(requiredName); // I use system require
        }
        if (this.manager.options.hostRequire) {
            if (debug.enabled) {
                debug(`Resolved ${requiredName} as host module`);
            }
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
    hasDependency(pluginContext, requiredName) {
        const { dependencyDetails } = pluginContext;
        if (!dependencyDetails) {
            return false;
        }
        return !!dependencyDetails[requiredName];
    }
    tryResolveAsFile(fullPath) {
        const parentPath = path.dirname(fullPath);
        if (checkPath(parentPath) !== "directory") {
            return undefined;
        }
        const reqPathKind = checkPath(fullPath);
        if (reqPathKind !== "file") {
            if (checkPath(fullPath + ".cjs") === "file") {
                return fullPath + ".cjs";
            }
            if (checkPath(fullPath + ".js") === "file") {
                return fullPath + ".js";
            }
            if (checkPath(fullPath + ".json") === "file") {
                return fullPath + ".json";
            }
            return undefined;
        }
        if (reqPathKind === "file") {
            return fullPath;
        }
        return undefined;
    }
    tryResolveAsDirectory(fullPath) {
        if (checkPath(fullPath) !== "directory") {
            return undefined;
        }
        const indexCjs = path.join(fullPath, "index.cjs");
        if (checkPath(indexCjs) === "file") {
            return indexCjs;
        }
        const indexJs = path.join(fullPath, "index.js");
        if (checkPath(indexJs) === "file") {
            return indexJs;
        }
        const indexJson = path.join(fullPath, "index.json");
        if (checkPath(indexJson) === "file") {
            return indexJson;
        }
        return undefined;
    }
    getPluginSandbox(pluginContext) {
        let pluginSandbox = this.sandboxCache.get(pluginContext);
        if (!pluginSandbox) {
            const srcSandboxTemplate = this.manager.getSandboxTemplate(pluginContext.name)
                || this.manager.options.sandbox;
            pluginSandbox = this.createGlobalSandbox(srcSandboxTemplate);
            this.sandboxCache.set(pluginContext, pluginSandbox);
        }
        return pluginSandbox;
    }
    createGlobalSandbox(sandboxTemplate) {
        const srcGlobal = sandboxTemplate.global || global;
        const sandbox = Object.assign({}, srcGlobal);
        // copy properties that are not copied automatically (don't know why..)
        //  https://stackoverflow.com/questions/59009214/some-properties-of-the-global-instance-are-not-copied-by-spread-operator-or-by-o
        // (some of these properties are Node.js specific, like Buffer)
        // Function and Object should not be defined, otherwise we will have some unexpected behavior
        // Somewhat related to https://github.com/nodejs/node/issues/28823
        if (!sandbox.Buffer && srcGlobal.Buffer) {
            sandbox.Buffer = srcGlobal.Buffer;
        }
        if (!sandbox.URL && global.URL) {
            // cast to any because URL is not defined inside NodeJSGlobal, I don't understand why ...
            sandbox.URL = global.URL;
        }
        if (!sandbox.URLSearchParams && global.URLSearchParams) {
            // cast to any because URLSearchParams is not defined inside NodeJSGlobal, I don't understand why ...
            sandbox.URLSearchParams = global.URLSearchParams;
        }
        if (!sandbox.process && global.process) {
            sandbox.process = Object.assign({}, global.process);
        }
        if (sandbox.process) {
            // override env to "unlink" from original process
            const srcEnv = sandboxTemplate.env || global.process.env;
            sandbox.process.env = Object.assign({}, srcEnv); // copy properties
            sandbox.process.on = (event, callback) => { };
        }
        // create global console
        if (!sandbox.console) {
            sandbox.console = new console.Console({ stdout: process.stdout, stderr: process.stderr });
        }
        // override the global obj to "unlink" it from the original global obj
        //  and make it unique for each sandbox
        sandbox.global = sandbox;
        return sandbox;
    }
}
exports.PluginVm = PluginVm;
function checkPath(fullPath) {
    try {
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
            return "directory";
        }
        else if (stats.isFile()) {
            return "file";
        }
        else {
            return "none";
        }
    }
    catch (_a) {
        return "none";
    }
}
//# sourceMappingURL=PluginVm.js.map