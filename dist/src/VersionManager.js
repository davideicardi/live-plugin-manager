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
exports.VersionManager = exports.DefaultMainFile = void 0;
const fs = __importStar(require("./fileSystem"));
const path = __importStar(require("path"));
const semver = __importStar(require("semver"));
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)("live-plugin-manager");
exports.DefaultMainFile = "index.js";
const cwd = process.cwd();
function createDefaultOptions() {
    return {
        cwd,
        rootPath: path.join(cwd, "plugin_packages", ".versions"),
    };
}
/**
 * A class to manage the versions of the downloaded packages.
 */
class VersionManager {
    constructor(options) {
        if (options && !options.rootPath && options.cwd) {
            options.rootPath = path.join(options.cwd, "plugin_packages", ".versions");
        }
        this.options = Object.assign(Object.assign({}, createDefaultOptions()), (options || {}));
    }
    /**
     * Ensure the root path exists.
     */
    ensureRootPath() {
        return __awaiter(this, void 0, void 0, function* () {
            yield fs.ensureDir(this.options.rootPath);
        });
    }
    /**
     * Get the location for the specified package name and version.
     *
     * @param packageInfo A package information to get the location
     * @returns A location for the specified package name and version
     */
    getPath(packageInfo) {
        const { name, version } = packageInfo;
        return path.join(this.options.rootPath, `${name}@${version}`);
    }
    /**
     * Resolve the path for the specified package name and version.
     *
     * @param name A package name to resolve
     * @param version A package version to resolve
     * @returns
     */
    resolvePath(name, version) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.ensureRootPath();
            let searchPath = this.options.rootPath;
            let moduleName = name;
            if (name.includes("/")) {
                const index = name.lastIndexOf("/");
                const scope = name.substring(0, index);
                searchPath = path.join(searchPath, scope);
                moduleName = name.substring(index + 1);
                if (!(yield fs.directoryExists(searchPath))) {
                    return undefined;
                }
            }
            const files = yield fs.readdir(searchPath);
            const filename = files.find((f) => this.checkModuleFilenameSatisfied(f, moduleName, version));
            if (filename === undefined) {
                return undefined;
            }
            return path.join(searchPath, filename);
        });
    }
    /**
     * Download a package using a downloader.
     * Downloaded files are stored in the rootPath as directory named as `name@version`.
     *
     * @param downloader A downloader object that implements the download method
     * @param registryInfo A package info to download
     * @returns A information for the downloaded package
     */
    download(downloader, registryInfo) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.ensureRootPath();
            const destPath = this.options.rootPath;
            yield fs.ensureDir(destPath);
            const destPackagePath = yield downloader.download(destPath, registryInfo);
            const packageJson = yield this.readPackageJsonFromPath(destPackagePath);
            if (!packageJson) {
                throw new Error(`Invalid plugin ${destPackagePath}, package.json is missing`);
            }
            const versionPath = path.join(destPath, `${packageJson.name}@${packageJson.version}`);
            yield fs.rename(destPackagePath, versionPath);
            if (debug.enabled) {
                debug(`Downloaded package ${packageJson.name}@${packageJson.version} to ${versionPath}`);
            }
            const downloadedJson = yield this.readPackageJsonFromPath(versionPath);
            if (!downloadedJson) {
                throw new Error(`Invalid plugin ${versionPath}, package.json is missing`);
            }
            return downloadedJson;
        });
    }
    /**
     * Uninstall packages which are not used by other packages.
     *
     * @param installedPlugins A list of the installed packages.
     * @returns A list of the uninstalled packages.
     */
    uninstallOrphans(installedPlugins) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.ensureRootPath();
            return yield this.uninstallOrphansLockFree(installedPlugins);
        });
    }
    /**
     * Unload a version of a plugin if it is not used by any other plugin
     *
     * @param pluginInfo A plugin information to uninstall
     * @returns true if the version was unloaded, false if it was used by another plugin
     */
    uninstallOrphan(pluginInfo) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.ensureRootPath();
            const used = yield this.checkVersionUsedInDir(pluginInfo);
            if (used) {
                return false;
            }
            yield this.removeVersion(pluginInfo);
            return true;
        });
    }
    /**
     * Create a plugin information for the specified version.
     *
     * @param name A package name
     * @param version A package version
     * @param withDependencies A flag to load dependency packages
     * @returns A plugin information for the specified version
     */
    createVersionInfo(name, version, withDependencies = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const location = path.join(this.options.rootPath, `${name}@${version}`);
            return yield this.createVersionInfoFromPath(location, withDependencies);
        });
    }
    /**
     * Create a plugin information for the specified path.
     *
     * @param location A path to the package directory
     * @param withDependencies A flag to load dependency packages
     * @returns A plugin information for the specified path
     */
    createVersionInfoFromPath(location, withDependencies = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const packageJson = yield this.readPackageJsonFromPath(location);
            if (!packageJson) {
                throw new Error(`Invalid plugin ${location}, package.json is missing`);
            }
            const mainFile = path.normalize(path.join(location, packageJson.main || exports.DefaultMainFile));
            if (!withDependencies) {
                return {
                    name: packageJson.name,
                    version: packageJson.version,
                    location,
                    mainFile,
                    dependencies: packageJson.dependencies || {},
                    optionalDependencies: packageJson.optionalDependencies || {},
                };
            }
            const dependencies = packageJson.dependencies || {};
            const dependencyNames = Object.keys(dependencies);
            const dependencyPackageJsons = yield Promise.all(dependencyNames.map((name) => __awaiter(this, void 0, void 0, function* () {
                const moduleLocation = path.join(location, "node_modules", name);
                return yield this.readPackageJsonFromPath(moduleLocation);
            })));
            const dependencyDetails = {};
            dependencyPackageJsons.forEach((p, i) => {
                dependencyDetails[dependencyNames[i]] = p;
            });
            return {
                name: packageJson.name,
                version: packageJson.version,
                location,
                mainFile,
                dependencies,
                optionalDependencies: packageJson.optionalDependencies || {},
                dependencyDetails,
            };
        });
    }
    /**
     * Check whether the filename is satisfied with the specified package name and version.
     *
     * @param filename A filename to check
     * @param name A package name to check
     * @param version A package version to check
     * @returns true if the filename is satisfied with the specified package name and version, otherwise false
     */
    checkModuleFilenameSatisfied(filename, name, version) {
        const m = filename.match(/^(.+)@([^@]+)$/);
        if (!m) {
            return false;
        }
        if (m[1] !== name) {
            return false;
        }
        return semver.satisfies(m[2], version);
    }
    /**
     * Get the package information from the package directory.
     *
     * @param location A path to the package directory
     * @returns A package information for the package directory
     */
    readPackageJsonFromPath(location) {
        return __awaiter(this, void 0, void 0, function* () {
            const packageJsonFile = path.join(location, "package.json");
            if (!(yield fs.fileExists(packageJsonFile))) {
                return undefined;
            }
            const packageJson = JSON.parse(yield fs.readFile(packageJsonFile, "utf8"));
            if (!packageJson.name
                || !packageJson.version) {
                throw new Error(`Invalid plugin ${location}, 'main', 'name' and 'version' properties are required in package.json`);
            }
            return packageJson;
        });
    }
    /**
     * List package directories in the specified base directory.
     *
     * @param baseDir A base directory to list
     * @param scope A scope for packages
     * @returns A list of the package directories
     */
    listVersionDirs(baseDir, scope) {
        return __awaiter(this, void 0, void 0, function* () {
            const files = yield fs.readdir(baseDir);
            const versionDirs = [];
            for (const file of files) {
                if (file === "install.lock" || file === "node_modules") {
                    continue;
                }
                const packageJsonPath = path.join(baseDir, file, "package.json");
                if (yield fs.fileExists(packageJsonPath)) {
                    versionDirs.push(scope ? `${scope}/${file}` : file);
                    continue;
                }
                const subDir = path.join(baseDir, file);
                const subDirs = yield this.listVersionDirs(subDir, scope ? `${scope}/${file}` : file);
                versionDirs.push(...subDirs);
            }
            return versionDirs;
        });
    }
    /**
     * Check whether the package is used by other packages.
     *
     * @param packageInfo A package information to check
     * @param baseDir A base directory to check. If not specified, the rootPath is used.
     * @returns true if the package is used by other packages, otherwise false
     */
    checkVersionUsedInDir(packageInfo, baseDir) {
        return __awaiter(this, void 0, void 0, function* () {
            const { name, version } = packageInfo;
            const location = baseDir || this.options.rootPath;
            const files = yield this.listVersionDirs(location);
            if (debug.enabled) {
                debug(`Checking ${name}@${version} in ${location}`);
            }
            for (const file of files) {
                if (debug.enabled) {
                    debug(`Checking ${name}@${version} in ${file}`);
                }
                const used = yield this.checkVersionUsedFromPackage(packageInfo, path.join(location, file));
                if (used) {
                    return true;
                }
            }
            return false;
        });
    }
    /**
     * Check whether the package is used by the specified package.
     *
     * @param packageInfo A package information to check
     * @param packageDir A package directory to check
     * @returns true if the package is used by the specified package, otherwise false
     */
    checkVersionUsedFromPackage(packageInfo, packageDir) {
        return __awaiter(this, void 0, void 0, function* () {
            let packageJson;
            try {
                packageJson = yield this.readPackageJsonFromPath(packageDir);
            }
            catch (e) {
                if (debug.enabled) {
                    debug(`Cannot load package.json ${packageDir}`, e);
                }
                return false;
            }
            if (!packageJson) {
                return false;
            }
            if (!packageJson.dependencies) {
                return false;
            }
            const { name, version } = packageInfo;
            if (!packageJson.dependencies[name]) {
                return false;
            }
            if (!semver.validRange(packageJson.dependencies[name])) {
                if (debug.enabled) {
                    debug(`Unexpected version range ${packageJson.dependencies[name]} for ${name}, treated as used.`);
                }
                return true;
            }
            if (semver.satisfies(version, packageJson.dependencies[name])) {
                if (debug.enabled) {
                    debug(`Found ${name}@${version} in ${packageDir}`);
                }
                return true;
            }
            return false;
        });
    }
    /**
     * Uninstall all of the orphaned packages.
     *
     * @param installedPlugins A list of the installed packages
     * @returns A list of the uninstalled packages
     */
    uninstallOrphansLockFree(installedPlugins) {
        return __awaiter(this, void 0, void 0, function* () {
            const rootPath = this.options.rootPath;
            const files = yield this.listVersionDirs(rootPath);
            const orphans = [];
            if (debug.enabled) {
                debug(`Checking orphans in ${rootPath}`);
            }
            for (const file of files) {
                const fullPath = path.join(rootPath, file);
                if (file === "install.lock") {
                    continue;
                }
                let packageJson;
                try {
                    packageJson = yield this.readPackageJsonFromPath(fullPath);
                }
                catch (e) {
                    if (debug.enabled) {
                        debug(`Cannot load package.json ${fullPath}`, e);
                    }
                    continue;
                }
                if (!packageJson) {
                    continue;
                }
                if (installedPlugins
                    .find((p) => packageJson && p.name === packageJson.name && p.version === packageJson.version)) {
                    continue;
                }
                let used = false;
                for (const anotherFile of files) {
                    if (anotherFile === file) {
                        continue;
                    }
                    if (yield this.checkVersionUsedFromPackage(packageJson, path.join(rootPath, anotherFile))) {
                        used = true;
                        break;
                    }
                }
                if (used) {
                    continue;
                }
                orphans.push(packageJson);
            }
            if (orphans.length === 0) {
                return [];
            }
            const uninstalled = [];
            for (const orphan of orphans) {
                const pluginInfo = yield this.createVersionInfo(orphan.name, orphan.version);
                yield this.removeVersion(pluginInfo);
                uninstalled.push(pluginInfo);
            }
            return uninstalled.concat(yield this.uninstallOrphansLockFree(installedPlugins));
        });
    }
    /**
     * Remove the specified version.
     *
     * @param pluginInfo A plugin information to remove
     */
    removeVersion(pluginInfo) {
        return __awaiter(this, void 0, void 0, function* () {
            const pathSegments = pluginInfo.name.split("/");
            pathSegments[pathSegments.length - 1] = `${pathSegments[pathSegments.length - 1]}@${pluginInfo.version}`;
            for (let i = 0; i < pathSegments.length; i++) {
                const pathToRemove = path.join(this.options.rootPath, ...pathSegments.slice(0, pathSegments.length - i));
                if (debug.enabled) {
                    debug(`Removing ${pathToRemove}`);
                }
                if (!(yield fs.directoryExists(pathToRemove))) {
                    continue;
                }
                if (i > 0) {
                    // For scoped packages, need to check if the parent directory is empty
                    const files = yield fs.readdir(pathToRemove);
                    if (files.length > 0) {
                        if (debug.enabled) {
                            debug(`Skip removing ${pathToRemove}, not empty`);
                        }
                        break;
                    }
                }
                yield fs.remove(pathToRemove);
            }
        });
    }
}
exports.VersionManager = VersionManager;
//# sourceMappingURL=VersionManager.js.map