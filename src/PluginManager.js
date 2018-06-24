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
const PluginInfo_1 = require("./PluginInfo");
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
            const pName = PluginInfo_1.PluginName.parse(name);
            const pVersionRef = VersionRef_1.parseVersionRef(versionRef);
            yield this.syncLock();
            try {
                return yield this.installLockFree(pName, pVersionRef);
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
            const pName = PluginInfo_1.PluginName.parse(name);
            const pVersion = VersionRef_1.NpmVersionRef.parse(versionRef);
            yield this.syncLock();
            try {
                return yield this.installFromNpmLockFree(pName, pVersion);
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
            const pName = PluginInfo_1.PluginName.parse(name);
            const pVersion = version
                ? PluginInfo_1.PluginVersion.parse(version)
                : undefined;
            yield this.syncLock();
            try {
                return yield this.installFromCodeLockFree(pName, code, pVersion);
            }
            finally {
                yield this.syncUnlock();
            }
        });
    }
    uninstall(name, version) {
        return __awaiter(this, void 0, void 0, function* () {
            yield fs.ensureDir(this.options.pluginsPath);
            const pName = PluginInfo_1.PluginName.parse(name);
            let pVersion;
            if (!version) {
                const pluginInstalled = this.getInfo(name);
                if (!pluginInstalled) {
                    return;
                }
                pVersion = pluginInstalled.pluginVersion;
            }
            else {
                pVersion = PluginInfo_1.PluginVersion.parse(version);
            }
            yield this.syncLock();
            try {
                return yield this.uninstallLockFree(pName, pVersion);
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
                    yield this.uninstallLockFree(plugin.pluginName, plugin.pluginVersion);
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
        const pName = PluginInfo_1.PluginName.parse(name);
        const key = pName.raw;
        if (!sandbox) {
            this.sandboxTemplates.delete(key);
            return;
        }
        this.sandboxTemplates.set(key, sandbox);
    }
    getSandboxTemplate(name) {
        const pName = PluginInfo_1.PluginName.parse(name);
        const key = pName.raw;
        return this.sandboxTemplates.get(key);
    }
    alreadyInstalled(name, version) {
        const pName = PluginInfo_1.PluginName.parse(name);
        const pVersion = VersionRef_1.parseVersionRef(version);
        const validPlugins = this.installedPlugins
            .filter((p) => p.satisfies(pName, pVersion))
            .sort(PluginInfo_1.pluginCompare);
        return validPlugins[validPlugins.length - 1];
    }
    getInfo(name, version) {
        const pluginName = PluginInfo_1.PluginName.parse(name);
        return this.installedPlugins.find((p) => p.satisfies(pluginName, version));
    }
    queryPackage(name, versionRef) {
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
        const pluginName = PluginInfo_1.PluginName.parse(name);
        return this.npmRegistry.get(pluginName, VersionRef_1.NpmVersionRef.parse(versionRef));
    }
    queryPackageFromGithub(repository) {
        return this.githubRegistry.get(VersionRef_1.GitHubRef.parse(repository));
    }
    runScript(code) {
        return this.vm.runScript(code);
    }
    uninstallLockFree(name, version) {
        return __awaiter(this, void 0, void 0, function* () {
            if (debug.enabled) {
                debug(`Uninstalling ${name}...`);
            }
            const info = this.getInfo(name);
            if (!info) {
                if (debug.enabled) {
                    debug(`${name} not installed`);
                }
                // remove already downloaded plugin if any
                yield this.removeDownloaded(name, version);
                return;
            }
            yield this.deleteAndUnloadPlugin(info);
        });
    }
    installLockFree(name, versionRef) {
        return __awaiter(this, void 0, void 0, function* () {
            if (VersionRef_1.GitHubRef.is(versionRef)) {
                return this.installFromGithubLockFree(versionRef);
            }
            else if (VersionRef_1.NpmVersionRef.is(versionRef)) {
                return this.installFromNpmLockFree(name, versionRef);
            }
            else {
                throw new Error("Invalid version reference");
            }
        });
    }
    installFromPathLockFree(sourceLocation, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const packageJson = yield this.readPackageJsonFromPath(sourceLocation);
            const pName = PluginInfo_1.PluginName.parse(packageJson.name);
            const pVersion = PluginInfo_1.PluginVersion.parse(packageJson.version);
            // already installed satisfied version
            if (!options.force) {
                const installedInfo = this.alreadyInstalled(pName, pVersion);
                if (installedInfo) {
                    return installedInfo;
                }
                const fromCache = yield this.tryInstallFromCache(pName, pVersion);
                if (fromCache) {
                    return fromCache;
                }
            }
            // clean up any already installed version
            yield this.uninstallLockFree(pName, pVersion);
            if (debug.enabled) {
                debug(`Copy from ${sourceLocation} to ${this.options.pluginsPath}`);
            }
            const pluginDir = this.getPluginLocation(pName, pVersion);
            yield fs.copy(sourceLocation, pluginDir, { exclude: ["node_modules"] });
            const pluginInfo = yield this.createPluginInfo(pName, pVersion, VersionRef_1.VersionRange.parse(pVersion), pluginDir);
            return this.addPlugin(pluginInfo);
        });
    }
    installFromNpmLockFree(name, versionRef) {
        return __awaiter(this, void 0, void 0, function* () {
            // already installed satisfied version
            const installedInfo = this.alreadyInstalled(name, versionRef);
            if (installedInfo) {
                return installedInfo;
            }
            const fromCache = yield this.tryInstallFromCache(name, versionRef);
            if (fromCache) {
                return fromCache;
            }
            const registryInfo = yield this.npmRegistry.get(name, versionRef);
            const pName = PluginInfo_1.PluginName.parse(registryInfo.name);
            const pVersion = PluginInfo_1.PluginVersion.parse(registryInfo.version);
            // clean up any already installed version
            yield this.uninstallLockFree(pName, pVersion);
            const pluginDir = this.getPluginLocation(pName, pVersion);
            yield this.npmRegistry.download(pluginDir, registryInfo);
            const pluginInfo = yield this.createPluginInfo(pName, pVersion, versionRef, pluginDir);
            return this.addPlugin(pluginInfo);
        });
    }
    installFromGithubLockFree(gitHubRef) {
        return __awaiter(this, void 0, void 0, function* () {
            const registryInfo = yield this.githubRegistry.get(gitHubRef);
            const pName = PluginInfo_1.PluginName.parse(registryInfo.name);
            const pVersion = PluginInfo_1.PluginVersion.parse(registryInfo.version);
            // already installed
            const installedInfo = this.alreadyInstalled(pName, pVersion);
            if (installedInfo) {
                return installedInfo;
            }
            const fromCache = yield this.tryInstallFromCache(pName, pVersion);
            if (fromCache) {
                return fromCache;
            }
            // clean up any already installed version
            yield this.uninstallLockFree(pName, pVersion);
            const pluginDir = this.getPluginLocation(pName, pVersion);
            yield this.githubRegistry.download(pluginDir, registryInfo);
            const pluginInfo = yield this.createPluginInfo(pName, pVersion, gitHubRef, pluginDir);
            return this.addPlugin(pluginInfo);
        });
    }
    installFromCodeLockFree(name, code, version) {
        return __awaiter(this, void 0, void 0, function* () {
            // If a version is specified
            if (version) {
                // already installed satisfied version
                const installedInfo = this.alreadyInstalled(name, version);
                if (installedInfo) {
                    return installedInfo;
                }
                // already created
                const fromCache = yield this.tryInstallFromCache(name, version);
                if (fromCache) {
                    return fromCache;
                }
            }
            else {
                version = PluginInfo_1.PluginVersion.parse("0.0.0");
            }
            // clean up any already installed version
            yield this.uninstallLockFree(name, version);
            if (debug.enabled) {
                debug(`Create plugin ${name} to ${this.options.pluginsPath} from code`);
            }
            const packageJson = {
                name: name.raw,
                version: version.semver.raw
            };
            const pluginDir = this.getPluginLocation(name, version);
            yield fs.ensureDir(pluginDir);
            yield fs.writeFile(path.join(pluginDir, DefaultMainFile), code);
            yield fs.writeFile(path.join(pluginDir, "package.json"), JSON.stringify(packageJson));
            const pluginInfo = yield this.createPluginInfo(name, version, VersionRef_1.VersionRange.parse(version), pluginDir);
            return this.addPlugin(pluginInfo);
        });
    }
    tryInstallFromCache(name, version) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.options.npmInstallMode === "useCache") {
                const packageAlreadyDownloaded = yield this.getDownloadedPackage(name, version);
                if (packageAlreadyDownloaded) {
                    const pName = PluginInfo_1.PluginName.parse(packageAlreadyDownloaded.name);
                    const pVersion = PluginInfo_1.PluginVersion.parse(packageAlreadyDownloaded.version);
                    const pluginDir = this.getPluginLocation(pName, pVersion);
                    const pluginInfo = yield this.createPluginInfo(pName, pVersion, VersionRef_1.VersionRange.parse(pVersion), pluginDir);
                    return this.addPlugin(pluginInfo);
                }
            }
            return undefined;
        });
    }
    installDependencies(plugin) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const dependency of plugin.dependencies) {
                dependency.resolvedMode = undefined;
                dependency.resolvedAs = undefined;
                const dName = dependency.name;
                const dVersion = dependency.versionRef;
                if (this.shouldIgnore(dName)) {
                    if (debug.enabled) {
                        debug(`Installing dependencies of ${plugin.pluginName}: ${dName} is ignored`);
                    }
                    dependency.resolvedMode = "ignored";
                }
                else if (this.isModuleAvailableFromHost(dName, dVersion)) {
                    if (debug.enabled) {
                        debug(`Installing dependencies of ${plugin.pluginName}: ${dName}@${dVersion} is already available on host`);
                    }
                    dependency.resolvedMode = "fromHost";
                }
                else {
                    const installed = this.alreadyInstalled(dName, dVersion);
                    if (installed) {
                        if (debug.enabled) {
                            debug(`Installing dependencies of ${plugin.pluginName}: ${dName}@${dVersion} is already installed`);
                        }
                        dependency.resolvedAs = installed;
                        dependency.resolvedMode = "fromPlugin";
                    }
                    else {
                        if (debug.enabled) {
                            debug(`Installing dependencies of ${plugin.pluginName}: ${dName}@${dVersion} ...`);
                        }
                        dependency.resolvedAs = yield this.installLockFree(dName, dVersion);
                        dependency.resolvedMode = "fromPlugin";
                    }
                }
            }
        });
    }
    unloadWithDependents(plugin) {
        this.unload(plugin);
        // Unload any other plugins that depends on the specified plugin passed
        //  recursively unload other dependedents
        for (const installed of this.installedPlugins) {
            if (installed.dependencies.some((d) => d.resolvedAs === plugin)) {
                this.unloadWithDependents(installed);
            }
        }
    }
    isModuleAvailableFromHost(name, version) {
        if (!this.options.hostRequire) {
            return false;
        }
        if (!VersionRef_1.VersionRange.is(version)) {
            return false;
        }
        // TODO Here I should check these values for performance?
        try {
            const modulePackage = this.options.hostRequire(name.raw + "/package.json");
            return semver.satisfies(modulePackage.version, version.range);
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
            yield fs.remove(location);
        });
    }
    getDownloadedPackages(name) {
        return __awaiter(this, void 0, void 0, function* () {
            const downloadedDirs = yield fs.getDirectories(this.options.pluginsPath);
            const downloadedPcks = yield Promise.all(downloadedDirs.map((downloadPath) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const packageJson = yield this.readPackageJsonFromPath(downloadPath);
                    const pName = PluginInfo_1.PluginName.parse(packageJson.name);
                    const pVersion = PluginInfo_1.PluginVersion.parse(packageJson.version);
                    const expectedLocation = this.getPluginLocation(pName, pVersion);
                    if (fs.pathsAreEqual(downloadPath, expectedLocation)) {
                        return packageJson;
                    }
                    else {
                        return undefined;
                    }
                }
                catch (e) {
                    // Plugin inside not valid folder names should not be returned
                    return undefined;
                }
            })));
            return downloadedPcks
                .filter((p) => p);
        });
    }
    getDownloadedPackage(name, version) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!VersionRef_1.VersionRange.is(version) && !PluginInfo_1.PluginVersion.is(version)) {
                return undefined;
            }
            const pVersionRange = VersionRef_1.VersionRange.parse(version);
            const packageJsonList = yield this.getDownloadedPackages(name);
            return packageJsonList.find((packageJson) => packageJson.name === name.raw
                && semver.satisfies(packageJson.version, pVersionRange.range));
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
            debug(`Loading ${filePath} of ${plugin.pluginName} (${resolvedPath})...`);
        }
        return this.vm.load(plugin, resolvedPath);
    }
    unload(plugin) {
        if (debug.enabled) {
            debug(`Unloading ${plugin.pluginName}...`);
        }
        this.vm.unload(plugin);
    }
    addPlugin(plugin) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.installDependencies(plugin);
            this.installedPlugins.push(plugin);
            return plugin;
        });
    }
    deleteAndUnloadPlugin(plugin) {
        return __awaiter(this, void 0, void 0, function* () {
            if (debug.enabled) {
                debug(`Delete and unloading ${plugin.name}...`);
            }
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
                ignoreMe = p.test(name.raw);
                if (ignoreMe) {
                    return true;
                }
            }
            ignoreMe = new RegExp(p).test(name.raw);
            if (ignoreMe) {
                return true;
            }
        }
        for (const key in this.options.staticDependencies) {
            if (!this.options.staticDependencies.hasOwnProperty(key)) {
                continue;
            }
            if (key === name.raw) {
                return true;
            }
        }
        return false;
    }
    createPluginInfo(name, version, requestedVersion, location) {
        return __awaiter(this, void 0, void 0, function* () {
            const packageJson = yield this.readPackageJsonFromPath(location);
            const mainFile = path.normalize(path.join(location, packageJson.main || DefaultMainFile));
            const dependenciesList = packageJson.dependencies || {};
            const dependencies = new Array();
            for (const key in dependenciesList) {
                if (!dependenciesList.hasOwnProperty(key)) {
                    continue;
                }
                const pName = PluginInfo_1.PluginName.parse(key);
                const pVersion = VersionRef_1.parseVersionRef(dependenciesList[key]);
                dependencies.push({
                    name: pName,
                    versionRef: pVersion
                });
            }
            return new PluginInfo_1.PluginInfo(mainFile, location, name, version, requestedVersion, dependencies);
        });
    }
}
exports.PluginManager = PluginManager;
//# sourceMappingURL=PluginManager.js.map