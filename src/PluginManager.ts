import * as fs from "./fileSystem";
import * as path from "path";
import {NpmRegistryClient, NpmRegistryConfig} from "./NpmRegistryClient";
import {PluginVm} from "./PluginVm";
import {IPluginInfo, PluginName, PluginVersion, pluginCompare, PluginDependency, PluginInfo} from "./PluginInfo";
import * as lockFile from "lockfile";
import * as semver from "semver";
import * as Debug from "debug";
import { GithubRegistryClient, GithubAuth } from "./GithubRegistryClient";
import { PackageJsonInfo, PackageInfo } from "./PackageInfo";
import {
	parseVersionRef,
	VersionRef,
	VersionRange,
	GitHubRef,
	NpmVersionRef,
	SatisfyMode,
	DistTag} from "./VersionRef";
const debug = Debug("live-plugin-manager");

const BASE_NPM_URL = "https://registry.npmjs.org";
const DefaultMainFile = "index.js";

export interface PluginManagerOptions {
	cwd: string;
	pluginsPath: string;
	sandbox: PluginSandbox;
	npmRegistryUrl: string;
	npmRegistryConfig: NpmRegistryConfig;
	npmInstallMode: "useCache" | "noCache";
	requireCoreModules: boolean;
	hostRequire?: NodeRequire;
	ignoredDependencies: Array<string | RegExp>;
	staticDependencies: { [key: string]: any; };
	githubAuthentication?: GithubAuth;
	lockWait: number;
	lockStale: number;
}

export interface PluginSandbox {
	env?: NodeJS.ProcessEnv;
	global?: NodeJS.Global;
}

const cwd = process.cwd();
const DefaultOptions: PluginManagerOptions = {
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

export interface InstallFromPathOptions {
	force: boolean;
}

export class PluginManager {
	readonly options: PluginManagerOptions;
	private readonly vm: PluginVm;
	private readonly installedPlugins = new Array<IPluginInfo>();
	private readonly npmRegistry: NpmRegistryClient;
	private readonly githubRegistry: GithubRegistryClient;
	private readonly sandboxTemplates = new Map<string, PluginSandbox>();

	constructor(options?: Partial<PluginManagerOptions>) {
		if (options && !options.pluginsPath && options.cwd) {
			options.pluginsPath = path.join(options.cwd, "plugin_packages");
		}

		this.options = {...DefaultOptions, ...(options || {})};
		this.vm = new PluginVm(this);
		this.npmRegistry = new NpmRegistryClient(this.options.npmRegistryUrl, this.options.npmRegistryConfig);
		this.githubRegistry = new GithubRegistryClient(this.options.githubAuthentication);
	}

	async install(name: PluginName | string, versionRef?: VersionRef | string): Promise<IPluginInfo> {
		await fs.ensureDir(this.options.pluginsPath);

		const pName = PluginName.parse(name);
		const pVersionRef = parseVersionRef(versionRef);

		await this.syncLock();
		try {
			return await this.installLockFree(pName, pVersionRef);
		} finally {
			await this.syncUnlock();
		}
	}

	/**
	 * Install a package from npm
	 * @param name name of the package
	 * @param version version of the package, default to "latest"
	 */
	async installFromNpm(name: string, versionRef?: NpmVersionRef | string): Promise<IPluginInfo> {
		await fs.ensureDir(this.options.pluginsPath);

		const pName = PluginName.parse(name);
		const pVersion = NpmVersionRef.parse(versionRef);

		await this.syncLock();
		try {
			return await this.installFromNpmLockFree(pName, pVersion);
		} finally {
			await this.syncUnlock();
		}
	}

	/**
	 * Install a package from a local folder
	 * @param location package local folder location
	 * @param options options, if options.force == true then package is always reinstalled without version checking
	 */
	async installFromPath(location: string, options: Partial<InstallFromPathOptions> = {}): Promise<IPluginInfo> {
		await fs.ensureDir(this.options.pluginsPath);

		await this.syncLock();
		try {
			return await this.installFromPathLockFree(location, options);
		} finally {
			await this.syncUnlock();
		}
	}

	async installFromGithub(gitHubRef: GitHubRef | string): Promise<IPluginInfo> {
		await fs.ensureDir(this.options.pluginsPath);

		await this.syncLock();
		try {
			return await this.installFromGithubLockFree(GitHubRef.parse(gitHubRef));
		} finally {
			await this.syncUnlock();
		}
	}

	/**
	 * Install a package by specifiing code directly. If no version is specified it will be always reinstalled.
	 * @param name plugin name
	 * @param code code to be loaded, equivalent to index.js
	 * @param version optional version, if omitted no version check is performed
	 */
	async installFromCode(
		name: PluginName | string,
		code: string,
		version?: PluginVersion | string): Promise<IPluginInfo> {
		await fs.ensureDir(this.options.pluginsPath);

		const pName = PluginName.parse(name);
		const pVersion = version
			? PluginVersion.parse(version)
			: undefined;

		await this.syncLock();
		try {
			return await this.installFromCodeLockFree(pName, code, pVersion);
		} finally {
			await this.syncUnlock();
		}
	}

	async uninstall(name: PluginName | string, version?: PluginVersion | string): Promise<void> {
		await fs.ensureDir(this.options.pluginsPath);

		const pName = PluginName.parse(name);
		let pVersion: PluginVersion;
		if (!version) {
			const pluginInstalled = this.getInfo(name);
			if (!pluginInstalled) {
				return;
			}
			pVersion = pluginInstalled.version;
		} else {
			pVersion = PluginVersion.parse(version);
		}

		await this.syncLock();
		try {
			return await this.uninstallLockFree(pName, pVersion);
		} finally {
			await this.syncUnlock();
		}
	}

	async uninstallAll(): Promise<void> {
		await fs.ensureDir(this.options.pluginsPath);

		await this.syncLock();
		try {
			// TODO First I should install dependents plugins??
			for (const plugin of this.installedPlugins.slice().reverse()) {
				await this.uninstallLockFree(plugin.name, plugin.version);
			}
		} finally {
			await this.syncUnlock();
		}
	}

	list(): IPluginInfo[] {
		return this.installedPlugins.map((p) => p);
	}

	require(fullName: string): any {
		const {pluginName, requiredPath} = this.vm.splitRequire(fullName);

		const info = this.getInfo(pluginName);
		if (!info) {
			throw new Error(`${pluginName} not installed`);
		}

		return this.load(info, requiredPath);
	}

	setSandboxTemplate(name: PluginName | string, sandbox: PluginSandbox | undefined): void {
		const info = this.getInfo(name);
		if (!info) {
			throw new Error(`${name} not installed`);
		}

		const pName = PluginName.parse(name);
		const key = pName.raw;

		if (!sandbox) {
			this.sandboxTemplates.delete(key);
			return;
		}
		this.sandboxTemplates.set(key, sandbox);
	}

	getSandboxTemplate(name: PluginName | string): PluginSandbox | undefined {
		const pName = PluginName.parse(name);
		const key = pName.raw;

		return this.sandboxTemplates.get(key);
	}

	alreadyInstalled(
		name: PluginName | string,
		version?: PluginVersion | VersionRef | string): IPluginInfo | undefined {

		const pName = PluginName.parse(name);
		const pVersion = parseVersionRef(version);

		const validPlugins = this.installedPlugins
			.filter((p) => p.satisfies(pName, pVersion))
			.sort(pluginCompare);

		return validPlugins[validPlugins.length - 1];
	}

	getInfo(name: PluginName | string, version?: PluginVersion | VersionRange): IPluginInfo | undefined {
		const pluginName = PluginName.parse(name);

		return this.installedPlugins.find((p) => p.satisfies(pluginName, version));
	}

	queryPackage(name: PluginName | string, versionRef?: VersionRef | string): Promise<PackageInfo> {
		const versionRefObj = parseVersionRef(versionRef);

		if (GitHubRef.is(versionRefObj)) {
			return this.queryPackageFromGithub(versionRefObj);
		} else if (NpmVersionRef.is(versionRefObj)) {
			return this.queryPackageFromNpm(name, versionRefObj);
		} else {
			throw new Error("Invalid version reference");
		}
	}

	queryPackageFromNpm(name: PluginName | string, versionRef?: NpmVersionRef | string): Promise<PackageInfo> {
		const pluginName = PluginName.parse(name);
		return this.npmRegistry.get(pluginName, NpmVersionRef.parse(versionRef));
	}

	queryPackageFromGithub(repository: GitHubRef | string): Promise<PackageInfo> {
		return this.githubRegistry.get(GitHubRef.parse(repository));
	}

	runScript(code: string): any {
		return this.vm.runScript(code);
	}

	private async uninstallLockFree(name: PluginName, version: PluginVersion): Promise<void> {
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

		await this.deleteAndUnloadPlugin(info);
	}

	private async installLockFree(name: PluginName, versionRef: VersionRef): Promise<IPluginInfo> {
		if (GitHubRef.is(versionRef)) {
			return this.installFromGithubLockFree(versionRef);
		} else if (NpmVersionRef.is(versionRef)) {
			return this.installFromNpmLockFree(name, versionRef);
		} else {
			throw new Error("Invalid version reference");
		}
	}

	private async installFromPathLockFree(
		location: string, options: Partial<InstallFromPathOptions>): Promise<IPluginInfo> {
		const packageJson = await this.readPackageJsonFromPath(location);

		const pName = PluginName.parse(packageJson.name);
		const pVersion = PluginVersion.parse(packageJson.version);

		// already installed satisfied version
		if (!options.force) {
			const installedInfo = this.alreadyInstalled(pName, pVersion);
			if (installedInfo) {
				return installedInfo;
			}

			const fromCache = await this.tryInstallFromCache(name, pVersion);
			if (fromCache) {
				return fromCache;
			}
		}

		if (debug.enabled) {
			debug(`Copy from ${location} to ${this.options.pluginsPath}`);
		}
		await fs.copy(location, this.getPluginLocation(pName, pVersion), { exclude: ["node_modules"] });

		const pluginInfo = await this.createPluginInfo(pName, pVersion, VersionRange.parse(pVersion));
		return this.addPlugin(pluginInfo);
	}

	private async installFromNpmLockFree(name: PluginName, versionRef: NpmVersionRef): Promise<IPluginInfo> {
		// already installed satisfied version
		const installedInfo = this.alreadyInstalled(name, versionRef);
		if (installedInfo) {
			return installedInfo;
		}

		const fromCache = await this.tryInstallFromCache(name, versionRef);
		if (fromCache) {
			return fromCache;
		}

		const registryInfo = await this.npmRegistry.get(name, versionRef);

		const pName = PluginName.parse(registryInfo.name);
		const pVersion = PluginVersion.parse(registryInfo.version);

		const pluginDir = this.getPluginLocation(pName, pVersion);
		await this.npmRegistry.download(
			pluginDir,
			registryInfo);

		const pluginInfo = await this.createPluginInfo(pName, pVersion, versionRef);
		return this.addPlugin(pluginInfo);
	}

	private async installFromGithubLockFree(gitHubRef: GitHubRef): Promise<IPluginInfo> {
		const registryInfo = await this.githubRegistry.get(gitHubRef);

		const pName = PluginName.parse(registryInfo.name);
		const pVersion = PluginVersion.parse(registryInfo.version);

		// already installed
		const installedInfo = this.alreadyInstalled(pName, pVersion);
		if (installedInfo) {
			return installedInfo;
		}

		const fromCache = await this.tryInstallFromCache(name, pVersion);
		if (fromCache) {
			return fromCache;
		}

		const pluginDir = this.getPluginLocation(pName, pVersion);
		await this.githubRegistry.download(
			pluginDir,
			registryInfo);

		const pluginInfo = await this.createPluginInfo(pName, pVersion, gitHubRef);
		return this.addPlugin(pluginInfo);
	}

	private async installFromCodeLockFree(name: PluginName, code: string, version?: PluginVersion): Promise<IPluginInfo> {
		// If a version is specified
		if (version) {
			// already installed satisfied version
			const installedInfo = this.alreadyInstalled(name, version);
			if (installedInfo) {
				return installedInfo;
			}

			// already created
			const fromCache = await this.tryInstallFromCache(name, version);
			if (fromCache) {
				return fromCache;
			}
		} else {
			version = PluginVersion.parse("0.0.0");
		}

		if (debug.enabled) {
			debug(`Create plugin ${name} to ${this.options.pluginsPath} from code`);
		}

		const packageJson: PackageInfo = {
			name: name.raw,
			version: version.semver.raw
		};

		const location = this.getPluginLocation(name, version);
		await fs.ensureDir(location);
		await fs.writeFile(path.join(location, DefaultMainFile), code);
		await fs.writeFile(path.join(location, "package.json"), JSON.stringify(packageJson));

		const pluginInfo = await this.createPluginInfo(name, version, VersionRange.parse(version));
		return this.addPlugin(pluginInfo);
	}

	private async tryInstallFromCache(
		name: PluginName,
		version: PluginVersion | VersionRef): Promise<IPluginInfo | undefined> {
		if (this.options.npmInstallMode === "useCache") {
			const packageAlreadyDownloaded = await this.getDownloadedPackage(name, version);
			if (packageAlreadyDownloaded) {
				const pName = PluginName.parse(packageAlreadyDownloaded.name);
				const pVersion = PluginVersion.parse(packageAlreadyDownloaded.version);
				const pluginInfo = await this.createPluginInfo(
					pName, pVersion, VersionRange.parse(pVersion));
				return this.addPlugin(pluginInfo);
			}
		}

		// remove already downloaded if any
		if (PluginVersion.is(version)) {
			await this.removeDownloaded(name, version);
		}

		return undefined;
	}

	private async installDependencies(plugin: IPluginInfo): Promise<void> {
		for (const dependency of plugin.dependencies) {
			dependency.resolvedMode = undefined;
			dependency.resolvedAs = undefined;

			const dName = dependency.name;
			const dVersion = dependency.versionRef;

			if (this.shouldIgnore(dName)) {
				if (debug.enabled) {
					debug(`Installing dependencies of ${plugin.name}: ${dName} is ignored`);
				}
				dependency.resolvedMode = "ignored";
			} else if (this.isModuleAvailableFromHost(dName, dVersion)) {
				if (debug.enabled) {
					debug(`Installing dependencies of ${plugin.name}: ${dName}@${dVersion} is already available on host`);
				}
				dependency.resolvedMode = "fromHost";
			} else {
				const installed = this.alreadyInstalled(dName, dVersion);
				if (installed) {
					if (debug.enabled) {
						debug(`Installing dependencies of ${plugin.name}: ${dName}@${dVersion} is already installed`);
					}
					dependency.resolvedAs = installed;
					dependency.resolvedMode = "fromPlugin";
				} else {
					if (debug.enabled) {
						debug(`Installing dependencies of ${plugin.name}: ${dName}@${dVersion} ...`);
					}
					dependency.resolvedAs = await this.installLockFree(dName, dVersion);
					dependency.resolvedMode = "fromPlugin";
				}
			}
		}
	}

	private unloadWithDependents(plugin: IPluginInfo) {
		this.unload(plugin);

		// Unload any other plugins that depends on the specified plugin passed
		//  recursively unload other dependedents
		for (const installed of this.installedPlugins) {
			if (installed.dependencies.some((d) => d.resolvedAs === plugin)) {
				this.unloadWithDependents(installed);
			}
		}
	}

	private isModuleAvailableFromHost(name: PluginName, version: VersionRef): boolean {
		if (!this.options.hostRequire) {
			return false;
		}
		if (!VersionRange.is(version)) {
			return false;
		}

		// TODO Here I should check these values for performance?
		try {
			const modulePackage = this.options.hostRequire(name.raw + "/package.json") as PackageInfo;
			return semver.satisfies(modulePackage.version, version.range);
		} catch (e) {
			return false;
		}
	}

	private getPluginLocation(name: PluginName, version: PluginVersion) {
		return path.join(this.options.pluginsPath, name.raw, version.semver.raw);
	}

	private async removeDownloaded(name: PluginName, version: PluginVersion) {
		const location = this.getPluginLocation(name, version);
		if (!(await fs.directoryExists(location))) {
			await fs.remove(location);
		}
	}

	private async getDownloadedPackages(name: PluginName): Promise<PackageInfo[]> {
		const downloadedDirs = await fs.getDirectories(this.options.pluginsPath);

		const downloadedPcks = await Promise.all(downloadedDirs.map(async (downloadPath) => {
			try {
				const packageJson = await this.readPackageJsonFromPath(downloadPath);

				const pName = PluginName.parse(packageJson.name);
				const pVersion = PluginVersion.parse(packageJson.version);
				const expectedLocation = this.getPluginLocation(pName, pVersion);

				if (fs.pathsAreEqual(downloadPath, expectedLocation)) {
					return packageJson;
				} else {
					return undefined;
				}
			} catch (e) {
				// Plugin inside not valid folder names should not be returned
				return undefined;
			}
		}));

		return downloadedPcks
			.filter((p) => p) as PackageInfo[];
	}

	private async getDownloadedPackage(
		name: PluginName,
		version: PluginVersion | VersionRef): Promise<PackageInfo | undefined> {

		if (!VersionRange.is(version) && !PluginVersion.is(version)) {
			return undefined;
		}

		const pVersionRange = VersionRange.parse(version);
		const packageJsonList = await this.getDownloadedPackages(name);

		return packageJsonList.find((packageJson) =>
			packageJson.name === name.raw
				&& semver.satisfies(packageJson.version, pVersionRange.range));
	}

	private async readPackageJsonFromPath(location: string): Promise<PackageJsonInfo> {
		const packageJsonFile = path.join(location, "package.json");
		if (!(await fs.fileExists(packageJsonFile))) {
			throw new Error(`Invalid plugin ${location}, package.json is missing`);
		}
		const packageJson = JSON.parse(await fs.readFile(packageJsonFile, "utf8"));

		if (!packageJson.name
			|| !packageJson.version) {
			throw new Error(
				`Invalid plugin ${location}, 'main', 'name' and 'version' properties are required in package.json`);
		}

		return packageJson;
	}

	private load(plugin: IPluginInfo, filePath?: string): any {
		filePath = filePath || plugin.mainFile;

		const resolvedPath = this.vm.resolve(plugin, filePath);

		if (debug.enabled) {
			debug(`Loading ${filePath} of ${plugin.name} (${resolvedPath})...`);
		}

		return this.vm.load(plugin, resolvedPath);
	}

	private unload(plugin: IPluginInfo) {
		if (debug.enabled) {
			debug(`Unloading ${plugin.name}...`);
		}
		this.vm.unload(plugin);
	}

	private async addPlugin(plugin: IPluginInfo): Promise<IPluginInfo> {
		await this.installDependencies(plugin);

		this.installedPlugins.push(plugin);

		return plugin;
	}

	private async deleteAndUnloadPlugin(plugin: IPluginInfo): Promise<void> {
		const index = this.installedPlugins.indexOf(plugin);
		if (index >= 0) {
			this.installedPlugins.splice(index, 1);
		}
		this.sandboxTemplates.delete(plugin.name.raw);

		this.unloadWithDependents(plugin);

		await fs.remove(plugin.location);
	}

	private syncLock() {
		if (debug.enabled) {
			debug("Acquiring lock ...");
		}

		const lockLocation = path.join(this.options.pluginsPath, "install.lock");
		return new Promise<void>((resolve, reject) => {
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

	private syncUnlock() {
		if (debug.enabled) {
			debug("Releasing lock ...");
		}

		const lockLocation = path.join(this.options.pluginsPath, "install.lock");
		return new Promise<void>((resolve, reject) => {
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

	private shouldIgnore(name: PluginName): boolean {
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

	private async createPluginInfo(
		name: PluginName,
		version: PluginVersion,
		requestedVersion: VersionRef): Promise<IPluginInfo> {
		const location = this.getPluginLocation(name, version);
		const packageJson = await this.readPackageJsonFromPath(location);

		const mainFile = path.normalize(path.join(location, packageJson.main || DefaultMainFile));

		const dependenciesList = packageJson.dependencies || {};
		const dependencies = new Array<PluginDependency>();
		for (const key in dependenciesList) {
			if (!dependenciesList.hasOwnProperty(key)) {
				continue;
			}

			const pName = PluginName.parse(key);
			const pVersion = parseVersionRef(dependenciesList[key]);
			dependencies.push({
				name: pName,
				versionRef: pVersion
			});
		}

		return new PluginInfo(
			mainFile,
			location,
			name,
			version,
			requestedVersion,
			dependencies
			);
	}
}
