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
const fs = require("./fileSystem");
const path = require("path");
const NpmRegistryClient_1 = require("./NpmRegistryClient");
const PluginVm_1 = require("./PluginVm");
const lockFile = require("lockfile");
const semver = require("semver");
const Debug = require("debug");
const GithubRegistryClient_1 = require("./GithubRegistryClient");
const VersionRef_1 = require("./VersionRef");
const debug = Debug("live-plugin-manager");
const BASE_NPM_URL = "https://registry.npmjs.org";
const DefaultMainFile = "index.js";
const cwd = process.cwd();
const DefaultOptions = {
    cwd,
    npmRegistryUrl: BASE_NPM_URL,
    sandbox: {},
    npmRegistryConfig: {},
    npmInstallMode: "useCache",
    pluginsPath: path.join(cwd, "plugin_packages"),
    requireCoreModules: true,
    hostRequire: require,
    ignoredDependencies: [/^@types\//],
    staticDependencies: {},
    lockWait: 120000,
    lockStale: 180000,
};
class PluginManager {
    constructor(options) {
        this.installedPlugins = new Array();
        this.sandboxTemplates = new Map();
        if (options && !options.pluginsPath && options.cwd) {
            options.pluginsPath = path.join(options.cwd, "plugin_packages");
        }
        this.options = Object.assign({}, DefaultOptions, (options || {}));
        this.vm = new PluginVm_1.PluginVm(this);
        this.npmRegistry = new NpmRegistryClient_1.NpmRegistryClient(this.options.npmRegistryUrl, this.options.npmRegistryConfig);
        this.githubRegistry = new GithubRegistryClient_1.GithubRegistryClient(this.options.githubAuthentication);
    }
    install(name, versionRef) {
        return __awaiter(this, void 0, void 0, function* () {
            yield fs.ensureDir(this.options.pluginsPath);
            yield this.syncLock();
            try {
                return yield this.installLockFree(name, versionRef);
            }
            finally {
                yield this.syncUnlock();
            }
        });
    }
    /**
     * Install a package from npm
     * @param name name of the package
     * @param version version of the package, default to "latest"
     */
    installFromNpm(name, versionRef) {
        return __awaiter(this, void 0, void 0, function* () {
            yield fs.ensureDir(this.options.pluginsPath);
            yield this.syncLock();
            try {
                return yield this.installFromNpmLockFreeCache(name, VersionRef_1.NpmVersionRef.parse(versionRef));
            }
            finally {
                yield this.syncUnlock();
            }
        });
    }
    /**
     * Install a package from a local folder
     * @param location package local folder location
     * @param options options, if options.force == true then package is always reinstalled without version checking
     */
    installFromPath(location, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            yield fs.ensureDir(this.options.pluginsPath);
            yield this.syncLock();
            try {
                return yield this.installFromPathLockFree(location, options);
            }
            finally {
                yield this.syncUnlock();
            }
        });
    }
    installFromGithub(gitHubRef) {
        return __awaiter(this, void 0, void 0, function* () {
            yield fs.ensureDir(this.options.pluginsPath);
            yield this.syncLock();
            try {
                return yield this.installFromGithubLockFree(VersionRef_1.GitHubRef.parse(gitHubRef));
            }
            finally {
                yield this.syncUnlock();
            }
        });
    }
    /**
     * Install a package by specifiing code directly. If no version is specified it will be always reinstalled.
     * @param name plugin name
     * @param code code to be loaded, equivalent to index.js
     * @param version optional version, if omitted no version check is performed
     */
    installFromCode(name, code, version) {
        return __awaiter(this, void 0, void 0, function* () {
            yield fs.ensureDir(this.options.pluginsPath);
            yield this.syncLock();
            try {
                return yield this.installFromCodeLockFree(name, code, version);
            }
            finally {
                yield this.syncUnlock();
            }
        });
    }
    uninstall(name) {
        return __awaiter(this, void 0, void 0, function* () {
            yield fs.ensureDir(this.options.pluginsPath);
            yield this.syncLock();
            try {
                return yield this.uninstallLockFree(name);
            }
            finally {
                yield this.syncUnlock();
            }
        });
    }
    uninstallAll() {
        return __awaiter(this, void 0, void 0, function* () {
            yield fs.ensureDir(this.options.pluginsPath);
            yield this.syncLock();
            try {
                // TODO First I should install dependents plugins??
                for (const plugin of this.installedPlugins.slice().reverse()) {
                    yield this.uninstallLockFree(plugin.name);
                }
            }
            finally {
                yield this.syncUnlock();
            }
        });
    }
    list() {
        return this.installedPlugins.map((p) => p);
    }
    require(fullName) {
        const { pluginName, requiredPath } = this.vm.splitRequire(fullName);
        const info = this.getInfo(pluginName);
        if (!info) {
            throw new Error(`${pluginName} not installed`);
        }
        return this.load(info, requiredPath);
    }
    setSandboxTemplate(name, sandbox) {
        const info = this.getInfo(name);
        if (!info) {
            throw new Error(`${name} not installed`);
        }
        if (!sandbox) {
            this.sandboxTemplates.delete(info.name);
            return;
        }
        this.sandboxTemplates.set(info.name, sandbox);
    }
    getSandboxTemplate(name) {
        return this.sandboxTemplates.get(name);
    }
    alreadyInstalled(name, version, mode = "satisfies") {
        const installedInfo = this.getInfo(name);
        if (installedInfo) {
            if (!version) {
                return installedInfo;
            }
            const vRange = VersionRef_1.VersionRange.parse(version);
            if (semver.satisfies(installedInfo.version, vRange.raw)) {
                return installedInfo;
            }
            else if (mode === "satisfiesOrGreater" && semver.gtr(installedInfo.version, vRange.raw)) {
                return installedInfo;
            }
        }
        return undefined;
    }
    getInfo(name) {
        return this.installedPlugins.find((p) => p.name === name);
    }
    queryPackage(name, versionRef) {
        if (!this.isValidPluginName(name)) {
            throw new Error(`Invalid plugin name '${name}'`);
        }
        const versionRefObj = VersionRef_1.parseVersionRef(versionRef);
        if (VersionRef_1.GitHubRef.is(versionRefObj)) {
            return this.queryPackageFromGithub(versionRefObj);
        }
        else if (VersionRef_1.NpmVersionRef.is(versionRefObj)) {
            return this.queryPackageFromNpm(name, versionRefObj);
        }
        else {
            throw new Error("Invalid version reference");
        }
    }
    queryPackageFromNpm(name, versionRef) {
        if (!this.isValidPluginName(name)) {
            throw new Error(`Invalid plugin name '${name}'`);
        }
        return this.npmRegistry.get(name, VersionRef_1.NpmVersionRef.parse(versionRef));
    }
    queryPackageFromGithub(repository) {
        return this.githubRegistry.get(VersionRef_1.GitHubRef.parse(repository));
    }
    runScript(code) {
        return this.vm.runScript(code);
    }
    uninstallLockFree(name) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isValidPluginName(name)) {
                throw new Error(`Invalid plugin name '${name}'`);
            }
            if (debug.enabled) {
                debug(`Uninstalling ${name}...`);
            }
            const info = this.getInfo(name);
            if (!info) {
                if (debug.enabled) {
                    debug(`${name} not installed`);
                }
                return;
            }
            yield this.deleteAndUnloadPlugin(info);
        });
    }
    installLockFree(name, versionRef) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isValidPluginName(name)) {
                throw new Error(`Invalid plugin name '${name}'`);
            }
            const versionRefObj = VersionRef_1.parseVersionRef(versionRef);
            if (VersionRef_1.GitHubRef.is(versionRefObj)) {
                return this.installFromGithubLockFree(versionRefObj);
            }
            else if (VersionRef_1.NpmVersionRef.is(versionRefObj)) {
                return this.installFromNpmLockFreeCache(name, versionRefObj);
            }
            else {
                throw new Error("Invalid version reference");
            }
        });
    }
    installFromPathLockFree(location, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const packageJson = yield this.readPackageJsonFromPath(location);
            if (!this.isValidPluginName(packageJson.name)) {
                throw new Error(`Invalid plugin name '${packageJson.name}'`);
            }
            // already installed satisfied version
            if (!options.force) {
                const installedInfo = this.alreadyInstalled(packageJson.name, packageJson.version);
                if (installedInfo) {
                    return installedInfo;
                }
            }
            // already installed not satisfied version
            if (this.alreadyInstalled(packageJson.name)) {
                yield this.uninstallLockFree(packageJson.name);
            }
            // already downloaded
            if (options.force || !(yield this.isAlreadyDownloaded(packageJson.name, packageJson.version))) {
                yield this.removeDownloaded(packageJson.name);
                if (debug.enabled) {
                    debug(`Copy from ${location} to ${this.options.pluginsPath}`);
                }
                yield fs.copy(location, this.getPluginLocation(packageJson.name), { exclude: ["node_modules"] });
            }
            const pluginInfo = yield this.createPluginInfo(packageJson.name);
            return this.addPlugin(pluginInfo);
        });
    }
    /** Install from npm or from cache if already available */
    installFromNpmLockFreeCache(name, versionRef) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isValidPluginName(name)) {
                throw new Error(`Invalid plugin name '${name}'`);
            }
            // already installed satisfied version
            const installedInfo = this.alreadyInstalled(name, versionRef);
            if (installedInfo) {
                return installedInfo;
            }
            if (this.alreadyInstalled(name)) {
                // already installed not satisfied version, then uninstall it first
                yield this.uninstallLockFree(name);
            }
            if (this.options.npmInstallMode === "useCache"
                && (yield this.isAlreadyDownloaded(name, version))) {
                const pluginInfo = yield this.createPluginInfo(name);
                return this.addPlugin(pluginInfo);
            }
            return this.installFromNpmLockFreeDirect(name, version);
        });
    }
    /** Install from npm */
    installFromNpmLockFreeDirect(name, version) {
        return __awaiter(this, void 0, void 0, function* () {
            const registryInfo = yield this.npmRegistry.get(name, version);
            // already downloaded
            if (!(yield this.isAlreadyDownloaded(registryInfo.name, registryInfo.version))) {
                yield this.removeDownloaded(registryInfo.name);
                yield this.npmRegistry.download(this.options.pluginsPath, registryInfo);
            }
            const pluginInfo = yield this.createPluginInfo(registryInfo.name);
            return this.addPlugin(pluginInfo);
        });
    }
    installFromGithubLockFree(gitHubRef) {
        return __awaiter(this, void 0, void 0, function* () {
            const registryInfo = yield this.githubRegistry.get(gitHubRef);
            if (!this.isValidPluginName(registryInfo.name)) {
                throw new Error(`Invalid plugin name '${name}'`);
            }
            // already installed satisfied version
            const installedInfo = this.alreadyInstalled(registryInfo.name, registryInfo.version);
            if (installedInfo) {
                return installedInfo;
            }
            // already installed not satisfied version
            if (this.alreadyInstalled(registryInfo.name)) {
                yield this.uninstallLockFree(registryInfo.name);
            }
            // already downloaded
            if (!(yield this.isAlreadyDownloaded(registryInfo.name, registryInfo.version))) {
                yield this.removeDownloaded(registryInfo.name);
                yield this.githubRegistry.download(this.options.pluginsPath, registryInfo);
            }
            const pluginInfo = yield this.createPluginInfo(registryInfo.name);
            return this.addPlugin(pluginInfo);
        });
    }
    installFromCodeLockFree(name, code, version = "0.0.0") {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isValidPluginName(name)) {
                throw new Error(`Invalid plugin name '${name}'`);
            }
            if (!semver.valid(version)) {
                throw new Error(`Invalid plugin version '${version}'`);
            }
            const packageJson = {
                name,
                version
            };
            // already installed satisfied version
            if (version !== "0.0.0") {
                const installedInfo = this.alreadyInstalled(packageJson.name, packageJson.version);
                if (installedInfo) {
                    return installedInfo;
                }
            }
            // already installed not satisfied version
            if (this.alreadyInstalled(packageJson.name)) {
                yield this.uninstallLockFree(packageJson.name);
            }
            // already created
            if (!(yield this.isAlreadyDownloaded(packageJson.name, packageJson.version))) {
                yield this.removeDownloaded(packageJson.name);
                if (debug.enabled) {
                    debug(`Create plugin ${name} to ${this.options.pluginsPath} from code`);
                }
                const location = this.getPluginLocation(name);
                yield fs.ensureDir(location);
                yield fs.writeFile(path.join(location, DefaultMainFile), code);
                yield fs.writeFile(path.join(location, "package.json"), JSON.stringify(packageJson));
            }
            const pluginInfo = yield this.createPluginInfo(packageJson.name);
            return this.addPlugin(pluginInfo);
        });
    }
    installDependencies(plugin) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!plugin.dependencies) {
                return {};
            }
            const dependencies = {};
            for (const key in plugin.dependencies) {
                if (!plugin.dependencies.hasOwnProperty(key)) {
                    continue;
                }
                if (this.shouldIgnore(key)) {
                    continue;
                }
                const version = plugin.dependencies[key];
                if (this.isModuleAvailableFromHost(key, version)) {
                    if (debug.enabled) {
                        debug(`Installing dependencies of ${plugin.name}: ${key} is already available on host`);
                    }
                }
                else if (this.alreadyInstalled(key, version, "satisfiesOrGreater")) {
                    if (debug.enabled) {
                        debug(`Installing dependencies of ${plugin.name}: ${key} is already installed`);
                    }
                }
                else {
                    if (debug.enabled) {
                        debug(`Installing dependencies of ${plugin.name}: ${key} ...`);
                    }
                    yield this.installLockFree(key, version);
                }
                // NOTE: maybe here I should put the actual version?
                dependencies[key] = version;
            }
            return dependencies;
        });
    }
    unloadDependents(pluginName) {
        for (const installed of this.installedPlugins) {
            if (installed.dependencies[pluginName]) {
                this.unloadWithDependents(installed);
            }
        }
    }
    unloadWithDependents(plugin) {
        this.unload(plugin);
        this.unloadDependents(plugin.name);
    }
    isModuleAvailableFromHost(name, version) {
        if (!this.options.hostRequire) {
            return false;
        }
        // TODO Here I should check also if version is compatible?
        // I can resolve the module, get the corresponding package.json
        //  load it and get the version, then use
        // if (semver.satisfies(installedInfo.version, version))
        // to check if compatible...
        try {
            const modulePackage = this.options.hostRequire(name + "/package.json");
            return semver.satisfies(modulePackage.version, version);
        }
        catch (e) {
            return false;
        }
    }
    getPluginLocation(name, version) {
        return path.join(this.options.pluginsPath, name.raw, version.semver.raw);
    }
    removeDownloaded(name, version) {
        return __awaiter(this, void 0, void 0, function* () {
            const location = this.getPluginLocation(name, version);
            if (!(yield fs.directoryExists(location))) {
                yield fs.remove(location);
            }
        });
    }
    isAlreadyDownloaded(name, versionRef) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!VersionRef_1.VersionRange.is(versionRef)) {
                return false;
            }
            const packageJsonList = yield this.getDownloadedPackages(name);
            return packageJsonList.some((packageJson) => packageJson.name === name.raw
                && semver.satisfies(packageJson.version, versionRef.raw));
        });
    }
    getDownloadedPackages(name) {
        return __awaiter(this, void 0, void 0, function* () {
        });
    }
    getDownloadedPackage(name, version) {
        return __awaiter(this, void 0, void 0, function* () {
            const location = this.getPluginLocation(name, version);
            if (!(yield fs.directoryExists(location))) {
                return;
            }
            try {
                const packageJson = yield this.readPackageJsonFromPath(location);
                return packageJson;
            }
            catch (e) {
                return;
            }
        });
    }
    readPackageJsonFromPath(location) {
        return __awaiter(this, void 0, void 0, function* () {
            const packageJsonFile = path.join(location, "package.json");
            if (!(yield fs.fileExists(packageJsonFile))) {
                throw new Error(`Invalid plugin ${location}, package.json is missing`);
            }
            const packageJson = JSON.parse(yield fs.readFile(packageJsonFile, "utf8"));
            if (!packageJson.name
                || !packageJson.version) {
                throw new Error(`Invalid plugin ${location}, 'main', 'name' and 'version' properties are required in package.json`);
            }
            return packageJson;
        });
    }
    load(plugin, filePath) {
        filePath = filePath || plugin.mainFile;
        const resolvedPath = this.vm.resolve(plugin, filePath);
        if (debug.enabled) {
            debug(`Loading ${filePath} of ${plugin.name} (${resolvedPath})...`);
        }
        return this.vm.load(plugin, resolvedPath);
    }
    unload(plugin) {
        if (debug.enabled) {
            debug(`Unloading ${plugin.name}...`);
        }
        this.vm.unload(plugin);
    }
    addPlugin(plugin) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.installDependencies(plugin);
            this.installedPlugins.push(plugin);
            // this.unloadDependents(plugin.name);
            return plugin;
        });
    }
    deleteAndUnloadPlugin(plugin) {
        return __awaiter(this, void 0, void 0, function* () {
            const index = this.installedPlugins.indexOf(plugin);
            if (index >= 0) {
                this.installedPlugins.splice(index, 1);
            }
            this.sandboxTemplates.delete(plugin.name);
            this.unloadWithDependents(plugin);
            yield fs.remove(plugin.location);
        });
    }
    syncLock() {
        if (debug.enabled) {
            debug("Acquiring lock ...");
        }
        const lockLocation = path.join(this.options.pluginsPath, "install.lock");
        return new Promise((resolve, reject) => {
            lockFile.lock(lockLocation, { wait: this.options.lockWait, stale: this.options.lockStale }, (err) => {
                if (err) {
                    if (debug.enabled) {
                        debug("Failed to acquire lock", err);
                    }
                    return reject("Failed to acquire lock: " + err.message);
                }
                resolve();
            });
        });
    }
    syncUnlock() {
        if (debug.enabled) {
            debug("Releasing lock ...");
        }
        const lockLocation = path.join(this.options.pluginsPath, "install.lock");
        return new Promise((resolve, reject) => {
            lockFile.unlock(lockLocation, (err) => {
                if (err) {
                    if (debug.enabled) {
                        debug("Failed to release lock", err);
                    }
                    return reject("Failed to release lock: " + err.message);
                }
                resolve();
            });
        });
    }
    shouldIgnore(name) {
        for (const p of this.options.ignoredDependencies) {
            let ignoreMe = false;
            if (p instanceof RegExp) {
                ignoreMe = p.test(name);
                if (ignoreMe) {
                    return true;
                }
            }
            ignoreMe = new RegExp(p).test(name);
            if (ignoreMe) {
                return true;
            }
        }
        for (const key in this.options.staticDependencies) {
            if (!this.options.staticDependencies.hasOwnProperty(key)) {
                continue;
            }
            if (key === name) {
                return true;
            }
        }
        return false;
    }
    createPluginInfo(name, version) {
        return __awaiter(this, void 0, void 0, function* () {
            const location = this.getPluginLocation(name, version);
            const packageJson = yield this.readPackageJsonFromPath(location);
            const mainFile = path.normalize(path.join(location, packageJson.main || DefaultMainFile));
            return {
                name: packageJson.name,
                version: packageJson.version,
                location,
                mainFile,
                dependencies: packageJson.dependencies || {}
            };
        });
    }
}
exports.PluginManager = PluginManager;
//# sourceMappingURL=PluginManager.js.map