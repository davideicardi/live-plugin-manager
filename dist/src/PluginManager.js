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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginManager = void 0;
const fs = __importStar(require("./fileSystem"));
const path = __importStar(require("path"));
const NpmRegistryClient_1 = require("./NpmRegistryClient");
const PluginVm_1 = require("./PluginVm");
const lockFile = __importStar(require("lockfile"));
const semver = __importStar(require("semver"));
const debug_1 = __importDefault(require("debug"));
const GithubRegistryClient_1 = require("./GithubRegistryClient");
const BitbucketRegistryClient_1 = require("./BitbucketRegistryClient");
const VersionManager_1 = require("./VersionManager");
const debug = (0, debug_1.default)("live-plugin-manager");
const BASE_NPM_URL = "https://registry.npmjs.org";
const cwd = process.cwd();
function createDefaultOptions() {
    return {
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
}
const NPM_LATEST_TAG = "latest";
class PluginManager {
    constructor(options) {
        this.installedPlugins = new Array();
        this.sandboxTemplates = new Map();
        if (options && !options.pluginsPath && options.cwd) {
            options.pluginsPath = path.join(options.cwd, "plugin_packages");
        }
        this.options = Object.assign(Object.assign({}, createDefaultOptions()), (options || {}));
        this.versionManager = new VersionManager_1.VersionManager({
            cwd: this.options.cwd,
            rootPath: this.options.versionsPath || path.join(this.options.pluginsPath, ".versions")
        });
        this.vm = new PluginVm_1.PluginVm(this);
        this.npmRegistry = new NpmRegistryClient_1.NpmRegistryClient(this.options.npmRegistryUrl, this.options.npmRegistryConfig);
        this.githubRegistry = new GithubRegistryClient_1.GithubRegistryClient(this.options.githubAuthentication);
        this.bitbucketRegistry = new BitbucketRegistryClient_1.BitbucketRegistryClient(this.options.bitbucketAuthentication);
    }
    install(name, version) {
        return __awaiter(this, void 0, void 0, function* () {
            yield fs.ensureDir(this.options.pluginsPath);
            yield this.syncLock();
            try {
                return yield this.installLockFree(name, version);
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
    installFromNpm(name, version = NPM_LATEST_TAG) {
        return __awaiter(this, void 0, void 0, function* () {
            yield fs.ensureDir(this.options.pluginsPath);
            yield this.syncLock();
            try {
                return yield this.installFromNpmLockFreeCache(name, version);
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
    installFromGithub(repository) {
        return __awaiter(this, void 0, void 0, function* () {
            yield fs.ensureDir(this.options.pluginsPath);
            yield this.syncLock();
            try {
                return yield this.installFromGithubLockFree(repository);
            }
            finally {
                yield this.syncUnlock();
            }
        });
    }
    installFromBitbucket(repository) {
        return __awaiter(this, void 0, void 0, function* () {
            yield fs.ensureDir(this.options.pluginsPath);
            yield this.syncLock();
            try {
                return yield this.installFromBitbucketLockFree(repository);
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
                yield this.uninstallLockFree(name);
                const removed = yield this.versionManager.uninstallOrphans(this.installedPlugins);
                yield Promise.all(removed
                    .map(pluginInfo => this.deleteAndUnloadPlugin(pluginInfo)));
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
                const removed = yield this.versionManager.uninstallOrphans(this.installedPlugins);
                yield Promise.all(removed
                    .map(pluginInfo => this.deleteAndUnloadPlugin(pluginInfo)));
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
            if (semver.satisfies(installedInfo.version, version)) {
                return installedInfo;
            }
            else if (mode === "satisfiesOrGreater" && semver.gtr(installedInfo.version, version)) {
                return installedInfo;
            }
        }
        return undefined;
    }
    getInfo(name) {
        return this.installedPlugins.find((p) => p.name === name);
    }
    queryPackage(name, version) {
        if (!this.isValidPluginName(name)) {
            throw new Error(`Invalid plugin name '${name}'`);
        }
        version = this.validatePluginVersion(version);
        if (version && this.githubRegistry.isGithubRepo(version)) {
            return this.queryPackageFromGithub(version);
        }
        return this.queryPackageFromNpm(name, version);
    }
    queryPackageFromNpm(name, version = NPM_LATEST_TAG) {
        if (!this.isValidPluginName(name)) {
            throw new Error(`Invalid plugin name '${name}'`);
        }
        version = this.validatePluginVersion(version);
        return this.npmRegistry.get(name, version);
    }
    queryPackageFromGithub(repository) {
        return this.githubRegistry.get(repository);
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
    installLockFree(name, version) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isValidPluginName(name)) {
                throw new Error(`Invalid plugin name '${name}'`);
            }
            version = this.validatePluginVersion(version);
            if (version && this.githubRegistry.isGithubRepo(version)) {
                return this.installFromGithubLockFree(version);
            }
            return this.installFromNpmLockFreeCache(name, version);
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
                const destLocation = this.versionManager.getPath(packageJson);
                if (!destLocation) {
                    throw new Error(`Cannot resolve path for ${packageJson.name}@${packageJson.version}`);
                }
                if (debug.enabled) {
                    debug(`Copy from ${location} to ${destLocation}`);
                }
                yield fs.copy(location, destLocation, { exclude: ["node_modules"] });
            }
            const pluginInfo = yield this.createPluginInfo(packageJson);
            return this.addPlugin(pluginInfo);
        });
    }
    /** Install from npm or from cache if already available */
    installFromNpmLockFreeCache(name, version = NPM_LATEST_TAG) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isValidPluginName(name)) {
                throw new Error(`Invalid plugin name '${name}'`);
            }
            version = this.validatePluginVersion(version);
            // already installed satisfied version
            const installedInfo = this.alreadyInstalled(name, version);
            if (installedInfo) {
                return installedInfo;
            }
            if (this.alreadyInstalled(name)) {
                // already installed not satisfied version, then uninstall it first
                yield this.uninstallLockFree(name);
            }
            if (this.options.npmInstallMode === "useCache"
                && (yield this.isAlreadyDownloaded(name, version))) {
                const packageJson = yield this.getDownloadedPackage(name, version);
                if (!packageJson) {
                    throw new Error(`Unexpected state: not found ${name}@${version}`);
                }
                const pluginInfo = yield this.createPluginInfo(packageJson);
                return this.addPlugin(pluginInfo);
            }
            return this.installFromNpmLockFreeDirect(name, version);
        });
    }
    /** Install from npm */
    installFromNpmLockFreeDirect(name, version = NPM_LATEST_TAG) {
        return __awaiter(this, void 0, void 0, function* () {
            const registryInfo = yield this.npmRegistry.get(name, version);
            // already downloaded
            if (!(yield this.isAlreadyDownloaded(registryInfo.name, registryInfo.version))) {
                yield this.removeDownloaded(registryInfo.name);
                yield this.versionManager.download(this.npmRegistry, registryInfo);
            }
            const pluginInfo = yield this.createPluginInfo(registryInfo);
            return this.addPlugin(pluginInfo);
        });
    }
    installFromGithubLockFree(repository) {
        return __awaiter(this, void 0, void 0, function* () {
            const registryInfo = yield this.githubRegistry.get(repository);
            if (!this.isValidPluginName(registryInfo.name)) {
                throw new Error(`Invalid plugin name '${registryInfo.name}'`);
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
            let downloadedInfo = undefined;
            if (!(yield this.isAlreadyDownloaded(registryInfo.name, registryInfo.version))) {
                yield this.removeDownloaded(registryInfo.name);
                downloadedInfo = yield this.versionManager.download(this.githubRegistry, registryInfo);
            }
            else {
                downloadedInfo = yield this.getDownloadedPackage(registryInfo.name, registryInfo.version);
                if (!downloadedInfo) {
                    throw new Error(`Unexpected state: not found ${registryInfo.name}@${registryInfo.version}`);
                }
            }
            const pluginInfo = yield this.createPluginInfo(downloadedInfo);
            return this.addPlugin(pluginInfo);
        });
    }
    installFromBitbucketLockFree(repository) {
        return __awaiter(this, void 0, void 0, function* () {
            const registryInfo = yield this.bitbucketRegistry.get(repository);
            if (!this.isValidPluginName(registryInfo.name)) {
                throw new Error(`Invalid plugin name '${registryInfo.name}'`);
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
            let downloadedInfo = undefined;
            if (!(yield this.isAlreadyDownloaded(registryInfo.name, registryInfo.version))) {
                yield this.removeDownloaded(registryInfo.name);
                downloadedInfo = yield this.versionManager.download(this.bitbucketRegistry, registryInfo);
            }
            else {
                downloadedInfo = yield this.getDownloadedPackage(registryInfo.name, registryInfo.version);
                if (!downloadedInfo) {
                    throw new Error(`Unexpected state: not found ${registryInfo.name}@${registryInfo.version}`);
                }
            }
            const pluginInfo = yield this.createPluginInfo(downloadedInfo);
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
                const location = this.versionManager.getPath({ name, version });
                if (!location) {
                    throw new Error(`Cannot resolve path for ${name}@${version}`);
                }
                yield fs.remove(location);
                yield fs.ensureDir(location);
                yield fs.writeFile(path.join(location, VersionManager_1.DefaultMainFile), code);
                yield fs.writeFile(path.join(location, "package.json"), JSON.stringify(packageJson));
            }
            const pluginInfo = yield this.createPluginInfo(packageJson);
            return this.addPlugin(pluginInfo);
        });
    }
    installDependency(plugin, name, version) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (this.shouldIgnore(name)) {
                    return { installed: false };
                }
                if (this.isModuleAvailableFromHost(name, version)) {
                    if (debug.enabled) {
                        debug(`Installing dependencies of ${plugin.name}: ${name} is already available on host`);
                    }
                }
                else if (this.alreadyInstalled(name, version)) {
                    if (debug.enabled) {
                        debug(`Installing dependencies of ${plugin.name}: ${name} is already installed`);
                    }
                    const installed = yield this.versionManager.resolvePath(name, version);
                    if (!installed) {
                        const error = new Error(`Cannot resolve path for ${name}@${version}`);
                        return { installed: false, error };
                    }
                    yield this.linkDependencyToPlugin(plugin, name, installed);
                }
                else {
                    if (debug.enabled) {
                        debug(`Installing dependencies of ${plugin.name}: ${name} ...`);
                    }
                    const installedPlugin = yield this.installLockFree(name, version);
                    const installed = yield this.versionManager.resolvePath(installedPlugin.name, installedPlugin.version);
                    if (!installed) {
                        const error = new Error(`Cannot resolve path for ${installedPlugin.name}@${installedPlugin.version}`);
                        return { installed: false, error };
                    }
                    yield this.linkDependencyToPlugin(plugin, name, installed);
                }
                return { installed: true };
            }
            catch (error) {
                if (debug.enabled) {
                    debug(`Error installing dependency ${name} for ${plugin.name}:`, error);
                }
                const err = error instanceof Error ? error : new Error(String(error));
                return { installed: false, error: err };
            }
        });
    }
    listDependencies(plugin) {
        const allDependenciesToInstall = Object.keys(plugin.dependencies).map((key) => ({ isOptional: false, name: key, version: plugin.dependencies[key] }));
        if (plugin.optionalDependencies) {
            const optDeps = plugin.optionalDependencies;
            allDependenciesToInstall.push(...Object.keys(optDeps).map((key) => ({ isOptional: true, name: key, version: optDeps[key] })));
        }
        return allDependenciesToInstall;
    }
    installDependencies(plugin) {
        return __awaiter(this, void 0, void 0, function* () {
            const installedDependencies = {};
            for (const dep of this.listDependencies(plugin)) {
                const installResult = yield this.installDependency(plugin, dep.name, dep.version);
                if (!installResult.installed && installResult.error) {
                    if (dep.isOptional) {
                        continue;
                    }
                    throw installResult.error;
                }
                // NOTE: maybe here I should put the actual installed version?
                installedDependencies[dep.name] = dep.version;
            }
            return installedDependencies;
        });
    }
    linkDependencyToPlugin(plugin, packageName, versionPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const nodeModulesPath = path.join(plugin.location, "node_modules");
            yield fs.ensureDir(nodeModulesPath);
            const modulePath = path.join(nodeModulesPath, packageName);
            const pathSegments = packageName.split("/");
            for (let i = 1; i < pathSegments.length; i++) {
                const pathToCreate = path.join(nodeModulesPath, ...pathSegments.slice(0, i));
                if (debug.enabled) {
                    debug(`Creating ${pathToCreate}`);
                }
                yield fs.ensureDir(pathToCreate);
            }
            const moduleExists = yield fs.pathExists(modulePath);
            if (moduleExists) {
                // remove link if it exists
                if (debug.enabled) {
                    debug(`Removing existing link ${modulePath}`);
                }
                yield fs.remove(modulePath);
            }
            yield fs.symlink(versionPath, modulePath);
        });
    }
    unloadDependents(pluginName) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const installed of this.installedPlugins) {
                if (installed.dependencies[pluginName]) {
                    if (debug.enabled) {
                        debug(`Attempting to unload dependent ${installed.name} of ${pluginName}...`);
                    }
                    yield this.unloadWithDependents(installed);
                }
            }
        });
    }
    unloadWithDependents(plugin) {
        return __awaiter(this, void 0, void 0, function* () {
            this.unload(plugin);
            yield this.unloadDependents(plugin.name);
        });
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
    isValidPluginName(name) {
        if (typeof name !== "string") {
            return false;
        }
        if (name.length === 0) {
            return false;
        }
        // '/' is permitted to support scoped packages
        if (name.startsWith(".")
            || name.indexOf("\\") >= 0) {
            return false;
        }
        return true;
    }
    validatePluginVersion(version) {
        version = version || NPM_LATEST_TAG;
        if (typeof version !== "string") {
            throw new Error("Invalid version");
        }
        return version;
    }
    getPluginLocation(name) {
        return path.join(this.options.pluginsPath, name);
    }
    removeDownloaded(name) {
        return __awaiter(this, void 0, void 0, function* () {
            const location = this.getPluginLocation(name);
            if (!(yield fs.directoryExists(location))) {
                yield fs.remove(location);
            }
        });
    }
    isAlreadyDownloaded(name, version) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!version) {
                version = ">0.0.1";
            }
            if (version === NPM_LATEST_TAG) {
                return false;
            }
            const packageJson = yield this.getDownloadedPackage(name, version);
            if (!packageJson) {
                return false;
            }
            return packageJson.name === name
                && semver.satisfies(packageJson.version, version);
        });
    }
    getDownloadedPackage(name, _version) {
        return __awaiter(this, void 0, void 0, function* () {
            const location = yield this.versionManager.resolvePath(name, _version);
            if (!location) {
                return;
            }
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
            const oldPluginIndex = this.installedPlugins.findIndex(p => p.name === plugin.name);
            if (oldPluginIndex !== -1) {
                const oldPlugins = this.installedPlugins.splice(oldPluginIndex, 1);
                yield this.unlinkModule(oldPlugins[0]);
            }
            const linkedPlugin = yield this.linkModule(plugin);
            this.installedPlugins.push(linkedPlugin);
            // this.unloadDependents(plugin.name);
            return linkedPlugin;
        });
    }
    /**
     * Unlink a plugin from the specified version of package.
     *
     * @param plugin A plugin information to unlink
     */
    unlinkModule(plugin) {
        return __awaiter(this, void 0, void 0, function* () {
            const location = this.getPluginLocation(plugin.name);
            if (debug.enabled) {
                debug(`Unlinking ${location} to ${plugin.name}@${plugin.version}`);
            }
            const pathSegments = plugin.name.split("/");
            for (let i = 0; i < pathSegments.length; i++) {
                const pathToRemove = path.join(this.options.pluginsPath, ...pathSegments.slice(0, pathSegments.length - i));
                if (debug.enabled) {
                    debug(`Removing ${pathToRemove}`);
                }
                if (!(yield fs.directoryExists(pathToRemove))) {
                    continue;
                }
                if (i > 0) {
                    const files = yield fs.readdir(pathToRemove);
                    if (files.length > 0) {
                        if (debug.enabled) {
                            debug(`Skipping ${pathToRemove} as it is not empty`);
                        }
                        break;
                    }
                }
                yield fs.remove(pathToRemove);
            }
            yield this.versionManager.uninstallOrphan(plugin);
        });
    }
    /**
     * Link a plugin to the specified version of package.
     *
     * @param plugin A plugin information to link
     * @returns A plugin information linked
     */
    linkModule(plugin) {
        return __awaiter(this, void 0, void 0, function* () {
            const location = this.getPluginLocation(plugin.name);
            const versionLocation = this.versionManager.getPath(plugin);
            if (!versionLocation) {
                throw new Error(`Cannot resolve path for ${plugin.name}@${plugin.version}`);
            }
            if (debug.enabled) {
                debug(`Linking ${location} to ${versionLocation}`);
            }
            yield fs.remove(location);
            // parent directory should be created before linking
            yield fs.ensureDir(path.dirname(location));
            yield fs.symlink(versionLocation, location);
            return this.createPluginInfoFromPath(location, true);
        });
    }
    deleteAndUnloadPlugin(plugin) {
        return __awaiter(this, void 0, void 0, function* () {
            const index = this.installedPlugins.indexOf(plugin);
            if (index >= 0) {
                this.installedPlugins.splice(index, 1);
            }
            this.sandboxTemplates.delete(plugin.name);
            yield this.unloadWithDependents(plugin);
            yield this.unlinkModule(plugin);
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
    createPluginInfo(packageInfo) {
        return __awaiter(this, void 0, void 0, function* () {
            const { name, version } = packageInfo;
            const location = yield this.versionManager.resolvePath(name, version);
            if (!location) {
                throw new Error(`Cannot resolve path for ${name}@${version}`);
            }
            return this.createPluginInfoFromPath(location);
        });
    }
    /**
     * Create a plugin information from the specified location.
     *
     * @param location A location of the plugin
     * @param withDependencies If true, dependencies are also loaded
     * @returns
     */
    createPluginInfoFromPath(location, withDependencies = false) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.versionManager.createVersionInfoFromPath(location, withDependencies);
        });
    }
}
exports.PluginManager = PluginManager;
//# sourceMappingURL=PluginManager.js.map