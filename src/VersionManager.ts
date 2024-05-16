import * as fs from "./fileSystem";
import * as path from "path";
import {IPluginInfo} from "./PluginInfo";
import * as semver from "semver";
import Debug from "debug";
import { PackageJsonInfo, PackageInfo } from "./PackageInfo";
const debug = Debug("live-plugin-manager");

export interface VersionManagerOptions {
	cwd: string;
	rootPath: string;
}

export const DefaultMainFile = "index.js";

const cwd = process.cwd();
function createDefaultOptions(): VersionManagerOptions {
	return {
		cwd,
		rootPath: path.join(cwd, "plugin_packages", ".versions"),
	};
}

/**
 * A class to manage the versions of the downloaded packages.
 */
export class VersionManager {
	readonly options: VersionManagerOptions;

	constructor(options?: Partial<VersionManagerOptions>) {
		if (options && !options.rootPath && options.cwd) {
			options.rootPath = path.join(options.cwd, "plugin_packages", ".versions");
		}

		this.options = {...createDefaultOptions(), ...(options || {})};
	}

	/**
	 * Ensure the root path exists.
	 */
	public async ensureRootPath() {
		await fs.ensureDir(this.options.rootPath);
	}

	/**
	 * Get the location for the specified package name and version.
	 *
	 * @param packageInfo A package information to get the location
	 * @returns A location for the specified package name and version
	 */
	public getPath(packageInfo: PackageInfo): string {
		const {name, version} = packageInfo;
		return path.join(this.options.rootPath, `${name}@${version}`);
	}

	/**
	 * Resolve the path for the specified package name and version.
	 *
	 * @param name A package name to resolve
	 * @param version A package version to resolve
	 * @returns
	 */
	public async resolvePath(name: string, version: string): Promise<string | undefined> {
		await this.ensureRootPath();
		let searchPath = this.options.rootPath;
		let moduleName = name;
		if (name.includes("/")) {
			const index = name.lastIndexOf("/");
			const scope = name.substring(0, index);
			searchPath = path.join(searchPath, scope);
			moduleName = name.substring(index + 1);
			if (!(await fs.directoryExists(searchPath))) {
				return undefined;
			}
		}
		const files = await fs.readdir(searchPath);
		const filename = files.find((f) => this.checkModuleFilenameSatisfied(f, moduleName, version));
		if (filename === undefined) {
			return undefined;
		}
		return path.join(searchPath, filename);
	}

	/**
	 * Download a package using a downloader.
	 * Downloaded files are stored in the rootPath as directory named as `name@version`.
	 *
	 * @param downloader A downloader object that implements the download method
	 * @param registryInfo A package info to download
	 * @returns A information for the downloaded package
	 */
	public async download(downloader: {
		download: (destinationDirectory: string, registryInfo: PackageJsonInfo) => Promise<string>;
	}, registryInfo: PackageJsonInfo) {
		await this.ensureRootPath();
		const destPath = this.options.rootPath;
		await fs.ensureDir(destPath);

		const destPackagePath = await downloader.download(destPath, registryInfo);
		const packageJson = await this.readPackageJsonFromPath(destPackagePath);
		if (!packageJson) {
			throw new Error(`Invalid plugin ${destPackagePath}, package.json is missing`);
		}
		const versionPath = path.join(destPath, `${packageJson.name}@${packageJson.version}`);
		await fs.rename(destPackagePath, versionPath);
		if (debug.enabled) {
			debug(`Downloaded package ${packageJson.name}@${packageJson.version} to ${versionPath}`);
		}
		const downloadedJson = await this.readPackageJsonFromPath(versionPath);
		if (!downloadedJson) {
			throw new Error(`Invalid plugin ${versionPath}, package.json is missing`);
		}
		return downloadedJson;
	}

	/**
	 * Uninstall packages which are not used by other packages.
	 *
	 * @param installedPlugins A list of the installed packages.
	 * @returns A list of the uninstalled packages.
	 */
	public async uninstallOrphans(installedPlugins: Array<IPluginInfo>): Promise<IPluginInfo[]> {
		await this.ensureRootPath();
		return await this.uninstallOrphansLockFree(installedPlugins);
	}

	/**
	 * Unload a version of a plugin if it is not used by any other plugin
	 *
	 * @param pluginInfo A plugin information to uninstall
	 * @returns true if the version was unloaded, false if it was used by another plugin
	 */
	public async uninstallOrphan(pluginInfo: IPluginInfo): Promise<boolean> {
		await this.ensureRootPath();
		const used = await this.checkVersionUsedInDir(pluginInfo);
		if (used) {
			return false;
		}
		await this.removeVersion(pluginInfo);
		return true;
	}

	/**
	 * Create a plugin information for the specified version.
	 *
	 * @param name A package name
	 * @param version A package version
	 * @param withDependencies A flag to load dependency packages
	 * @returns A plugin information for the specified version
	 */
	public async createVersionInfo(name: string, version: string, withDependencies: boolean = false): Promise<IPluginInfo> {
		const location = path.join(this.options.rootPath, `${name}@${version}`);
		return await this.createVersionInfoFromPath(location, withDependencies);
	}

	/**
	 * Create a plugin information for the specified path.
	 *
	 * @param location A path to the package directory
	 * @param withDependencies A flag to load dependency packages
	 * @returns A plugin information for the specified path
	 */
	public async createVersionInfoFromPath(location: string, withDependencies: boolean = false): Promise<IPluginInfo> {
		const packageJson = await this.readPackageJsonFromPath(location);
		if (!packageJson) {
			throw new Error(`Invalid plugin ${location}, package.json is missing`);
		}

		const mainFile = path.normalize(path.join(location, packageJson.main || DefaultMainFile));
		if (!withDependencies) {
			return {
				name: packageJson.name,
				version: packageJson.version,
				location,
				mainFile,
				dependencies: packageJson.dependencies || {},
			};
		}

		const dependencies = packageJson.dependencies || {};
		const dependencyNames = Object.keys(dependencies);
		const dependencyPackageJsons = await Promise.all(dependencyNames.map(async (name) => {
			const moduleLocation = path.join(location, "node_modules", name);
			return await this.readPackageJsonFromPath(moduleLocation);
		}));
		const dependencyDetails: { [name: string]: PackageJsonInfo | undefined } = {};
		dependencyPackageJsons.forEach((p, i) => {
			dependencyDetails[dependencyNames[i]] = p;
		});

		return {
			name: packageJson.name,
			version: packageJson.version,
			location,
			mainFile,
			dependencies,
			dependencyDetails,
		};
	}

	/**
	 * Check whether the filename is satisfied with the specified package name and version.
	 *
	 * @param filename A filename to check
	 * @param name A package name to check
	 * @param version A package version to check
	 * @returns true if the filename is satisfied with the specified package name and version, otherwise false
	 */
	private checkModuleFilenameSatisfied(filename: string, name: string, version: string): boolean {
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
	private async readPackageJsonFromPath(location: string): Promise<PackageJsonInfo | undefined> {
		const packageJsonFile = path.join(location, "package.json");
		if (!(await fs.fileExists(packageJsonFile))) {
			return undefined;
		}
		const packageJson = JSON.parse(await fs.readFile(packageJsonFile, "utf8"));

		if (!packageJson.name
			|| !packageJson.version) {
			throw new Error(
				`Invalid plugin ${location}, 'main', 'name' and 'version' properties are required in package.json`);
		}

		return packageJson;
	}

	/**
	 * List package directories in the specified base directory.
	 *
	 * @param baseDir A base directory to list
	 * @param scope A scope for packages
	 * @returns A list of the package directories
	 */
	private async listVersionDirs(baseDir: string, scope?: string): Promise<string[]> {
		const files = await fs.readdir(baseDir);
		const versionDirs = [];
		for (const file of files) {
			if (file === "install.lock" || file === "node_modules") {
				continue;
			}
			const packageJsonPath = path.join(baseDir, file, "package.json");
			if (await fs.fileExists(packageJsonPath)) {
				versionDirs.push(scope ? `${scope}/${file}` : file);
				continue;
			}
			const subDir = path.join(baseDir, file);
			const subDirs = await this.listVersionDirs(subDir, scope ? `${scope}/${file}` : file);
			versionDirs.push(...subDirs);
		}
		return versionDirs;
	}

	/**
	 * Check whether the package is used by other packages.
	 *
	 * @param packageInfo A package information to check
	 * @param baseDir A base directory to check. If not specified, the rootPath is used.
	 * @returns true if the package is used by other packages, otherwise false
	 */
	private async checkVersionUsedInDir(
		packageInfo: PackageInfo, baseDir?: string,
	): Promise<boolean> {
		const {name, version} = packageInfo;
		const location = baseDir || this.options.rootPath;
		const files = await this.listVersionDirs(location);
		if (debug.enabled) {
			debug(`Checking ${name}@${version} in ${location}`);
		}
		for (const file of files) {
			if (debug.enabled) {
				debug(`Checking ${name}@${version} in ${file}`);
			}
			const used = await this.checkVersionUsedFromPackage(packageInfo, path.join(location, file));
			if (used) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Check whether the package is used by the specified package.
	 *
	 * @param packageInfo A package information to check
	 * @param packageDir A package directory to check
	 * @returns true if the package is used by the specified package, otherwise false
	 */
	private async checkVersionUsedFromPackage(
		packageInfo: PackageInfo, packageDir: string,
	): Promise<boolean> {
		let packageJson: PackageJsonInfo | undefined;
		try {
			packageJson = await this.readPackageJsonFromPath(packageDir);
		} catch (e) {
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
		const {name, version} = packageInfo;
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
	}

	/**
	 * Uninstall all of the orphaned packages.
	 *
	 * @param installedPlugins A list of the installed packages
	 * @returns A list of the uninstalled packages
	 */
	private async uninstallOrphansLockFree(installedPlugins: Array<IPluginInfo>): Promise<IPluginInfo[]> {
		const rootPath = this.options.rootPath;
		const files = await this.listVersionDirs(rootPath);
		const orphans = [];
		if (debug.enabled) {
			debug(`Checking orphans in ${rootPath}`);
		}
		for (const file of files) {
			const fullPath = path.join(rootPath, file);
			if (file === "install.lock") {
				continue;
			}
			let packageJson: PackageJsonInfo | undefined;
			try {
				packageJson = await this.readPackageJsonFromPath(fullPath);
			} catch (e) {
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
				if (await this.checkVersionUsedFromPackage(packageJson, path.join(rootPath, anotherFile))) {
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
			const pluginInfo = await this.createVersionInfo(orphan.name, orphan.version);
			await this.removeVersion(pluginInfo);
			uninstalled.push(pluginInfo);
		}
		return uninstalled.concat(await this.uninstallOrphansLockFree(installedPlugins));
	}

	/**
	 * Remove the specified version.
	 *
	 * @param pluginInfo A plugin information to remove
	 */
	private async removeVersion(pluginInfo: IPluginInfo) {
		const pathSegments = pluginInfo.name.split("/");
		pathSegments[pathSegments.length - 1] = `${pathSegments[pathSegments.length - 1]}@${pluginInfo.version}`;
		for (let i = 0; i < pathSegments.length; i++) {
			const pathToRemove = path.join(this.options.rootPath, ...pathSegments.slice(0, pathSegments.length - i));
			if (debug.enabled) {
				debug(`Removing ${pathToRemove}`);
			}
			if (!(await fs.directoryExists(pathToRemove))) {
				continue;
			}
			if (i > 0) {
				// For scoped packages, need to check if the parent directory is empty
				const files = await fs.readdir(pathToRemove);
				if (files.length > 0) {
					if (debug.enabled) {
						debug(`Skip removing ${pathToRemove}, not empty`);
					}
					break;
				}
			}
			await fs.remove(pathToRemove);
		}
	}
}