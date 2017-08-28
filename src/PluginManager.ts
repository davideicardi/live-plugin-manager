import * as fs from "./fileSystem";
import * as path from "path";
import * as url from "url";
import {NpmRegistryClient, PackageInfo} from "./NpmRegistryClient";
import {PluginVm} from "./PluginVm";
import {PluginInfo, IPluginInfo} from "./PluginInfo";
import * as lockFile from "lockfile";
import * as semver from "semver";
import * as Debug from "debug";
const debug = Debug("live-plugin-manager");

const BASE_NPM_URL = "https://registry.npmjs.org";

export interface PluginManagerOptions {
	pluginsPath: string;
	sandbox: any;
	npmRegistryUrl: string;
	npmRegistryConfig: any;
	requireCoreModules: boolean;
	hostRequire?: NodeRequire;
	ignoredDependencies: Array<string|RegExp>;
	staticDependencies: { [key: string]: any; };
}

const cwd = process.cwd();
const DefaultOptions: PluginManagerOptions = {
	npmRegistryUrl: BASE_NPM_URL,
	sandbox: {},
	npmRegistryConfig: {},
	pluginsPath: path.join(cwd, "plugins"),
	requireCoreModules: true,
	hostRequire: require,
	ignoredDependencies: [/^@types\//],
	staticDependencies: {}
};

const NPM_LATEST_TAG = "latest";

export class PluginManager {
	readonly options: PluginManagerOptions;
	private readonly vm: PluginVm;
	private readonly installedPlugins = new Array<PluginInfo>();
	private readonly npmRegistry: NpmRegistryClient;

	constructor(options?: Partial<PluginManagerOptions>) {
		this.options = {...DefaultOptions, ...(options || {})};
		this.vm = new PluginVm(this);
		this.npmRegistry = new NpmRegistryClient(this.options.npmRegistryUrl, this.options.npmRegistryConfig);
	}

	async installFromNpm(name: string, version = NPM_LATEST_TAG): Promise<IPluginInfo> {
		await fs.ensureDir(this.options.pluginsPath);

		await this.syncLock();
		try {
			return await this.installFromNpmLockFree(name, version);
		} finally {
			await this.syncUnlock();
		}
	}

	async installFromPath(location: string): Promise<IPluginInfo> {
		await fs.ensureDir(this.options.pluginsPath);

		await this.syncLock();
		try {
			return await this.installFromPathLockFree(location);
		} finally {
			await this.syncUnlock();
		}
	}

	async uninstall(name: string): Promise<void> {
		await this.syncLock();
		try {
			return await this.uninstallLockFree(name);
		} finally {
			await this.syncUnlock();
		}
	}

	async uninstallAll(): Promise<void> {
		await this.syncLock();
		try {
			// TODO First I should install dependents plugins??
			for (const plugin of this.installedPlugins.slice().reverse()) {
				await this.uninstallLockFree(plugin.name);
			}
		} finally {
			await this.syncUnlock();
		}
	}

	list(): IPluginInfo[] {
		return this.installedPlugins.map((p) => p);
	}

	require(name: string): any {
		const info = this.getFullInfo(name);
		if (!info) {
			throw new Error(`${name} not installed`);
		}

		if (!info.loaded) {
			this.load(info);
		}

		return info.instance;
	}

	alreadyInstalled(name: string, version?: string): IPluginInfo | undefined {
		const installedInfo = this.getInfo(name);
		if (installedInfo) {
			if (!version) {
				return installedInfo;
			}

			if (semver.satisfies(installedInfo.version, version)) {
				return installedInfo;
			}
		}

		return undefined;
	}

	getInfo(name: string): IPluginInfo | undefined {
		return this.getFullInfo(name);
	}

	async getInfoFromNpm(name: string, version = NPM_LATEST_TAG): Promise<PackageInfo> {
		return await this.npmRegistry.get(name, version);
	}

	runScript(code: string): any {
		return this.vm.runScript(code);
	}

	getFullInfo(name: string): PluginInfo | undefined {
		return this.installedPlugins.find((p) => p.name === name);
	}

	private async uninstallLockFree(name: string): Promise<void> {
		debug(`Uninstalling ${name}...`);

		const info = this.getFullInfo(name);
		if (!info) {
			debug(`${name} not installed`);
			return;
		}

		await this.deleteAndUnloadPlugin(info);
	}

	private async installFromPathLockFree(location: string): Promise<IPluginInfo> {
		const packageJson = await this.readPackageJsonFromPath(location);

		// already installed satisfied version
		const installedInfo = this.alreadyInstalled(packageJson.name, packageJson.version);
		if (installedInfo) {
			return installedInfo;
		}

		// already installed not satisfied version
		if (this.alreadyInstalled(packageJson.name)) {
			await this.uninstallLockFree(packageJson.name);
		}

		// already downloaded
		if (!(await this.isAlreadyDownloaded(packageJson.name, packageJson.version))) {
			await this.removeDownloaded(packageJson.name);

			debug(`Copy from ${location} to ${this.options.pluginsPath}`);
			await fs.copy(location, this.getPluginLocation(packageJson.name));
		}

		return await this.addPlugin(packageJson);
	}

	private async installFromNpmLockFree(name: string, version = NPM_LATEST_TAG): Promise<IPluginInfo> {
		const registryInfo = await this.npmRegistry.get(name, version);

		// already installed satisfied version
		const installedInfo = this.alreadyInstalled(registryInfo.name, registryInfo.version);
		if (installedInfo) {
			return installedInfo;
		}

		// already installed not satisfied version
		if (this.alreadyInstalled(registryInfo.name)) {
			await this.uninstallLockFree(registryInfo.name);
		}

		// already downloaded
		if (!(await this.isAlreadyDownloaded(registryInfo.name, registryInfo.version))) {
			await this.removeDownloaded(registryInfo.name);

			await this.npmRegistry.download(
				this.options.pluginsPath,
				registryInfo);
		}

		return await this.addPlugin(registryInfo);
	}

	private async installDependencies(packageInfo: PackageInfo): Promise<string[]> {
		if (!packageInfo.dependencies) {
			return [];
		}

		const dependencies = new Array<string>();

		for (const key in packageInfo.dependencies) {
			if (this.shouldIgnore(key)) {
				continue;
			}

			if (packageInfo.dependencies.hasOwnProperty(key)) {
				const version = packageInfo.dependencies[key].toString();

				if (this.isModuleAvailableFromHost(key)) {
					debug(`Installing dependencies of ${packageInfo.name}: ${key} is already available on host`);
				} else if (this.alreadyInstalled(key, version)) {
					debug(`Installing dependencies of ${packageInfo.name}: ${key} is already installed`);
				} else {
					debug(`Installing dependencies of ${packageInfo.name}: ${key} ...`);
					await this.installFromNpmLockFree(key, version);
				}

				dependencies.push(key);
			}
		}

		return dependencies;
	}

	private unloadWithDependents(plugin: PluginInfo) {
		this.unload(plugin);

		for (const dependent of this.installedPlugins) {
			if (dependent.dependencies.indexOf(plugin.name) >= 0) {
				this.unloadWithDependents(dependent);
			}
		}
	}

	private isModuleAvailableFromHost(name: string): boolean {
		if (!this.options.hostRequire) {
			return false;
		}

		try {
			this.options.hostRequire.resolve(name);
			return true;
		} catch (e) {
			return false;
		}
	}

	private getPluginLocation(name: string) {
		const safeName = name.replace("/", path.sep).replace("\\", path.sep);
		return path.join(this.options.pluginsPath, name);
	}

	private async removeDownloaded(name: string) {
		const location = this.getPluginLocation(name);
		if (!(await fs.exists(location))) {
			await fs.remove(location);
		}
	}

	private async isAlreadyDownloaded(name: string, version: string): Promise<boolean> {
		const location = this.getPluginLocation(name);
		if (!(await fs.exists(location))) {
			return false;
		}

		try {
			const packageJson = await this.readPackageJsonFromPath(location);

			return (packageJson.name === name && packageJson.version === version);
		} catch (e) {
			return false;
		}
	}

	private async readPackageJsonFromPath(location: string): Promise<PackageInfo> {
		const packageJsonFile = path.join(location, "package.json");
		if (!(await fs.exists(packageJsonFile))) {
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

	private load(plugin: PluginInfo) {
		debug(`Loading ${plugin.name}...`);
		plugin.instance = this.vm.load(plugin, plugin.mainFile);
		plugin.loaded = true;
	}

	private unload(plugin: PluginInfo) {
		debug(`Unloading ${plugin.name}...`);
		plugin.loaded = false;
		plugin.instance = undefined;
		this.vm.unload(plugin);
	}

	private async addPlugin(packageInfo: PackageInfo): Promise<PluginInfo> {
		const dependencies = await this.installDependencies(packageInfo);

		const DefaultMainFile = "index.js";
		const DefaultMainFileExtension = ".js";

		const location = this.getPluginLocation(packageInfo.name);
		const pluginInfo = {
			name: packageInfo.name,
			version: packageInfo.version,
			location,
			mainFile: path.normalize(path.join(location, packageInfo.main || DefaultMainFile)),
			loaded: false,
			dependencies
		};

		// If no extensions for main file is used, just default to .js
		if (!path.extname(pluginInfo.mainFile)) {
			pluginInfo.mainFile += DefaultMainFileExtension;
		}

		this.installedPlugins.push(pluginInfo);

		return pluginInfo;
	}

	private async deleteAndUnloadPlugin(plugin: PluginInfo): Promise<void> {
		const index = this.installedPlugins.indexOf(plugin);
		if (index >= 0) {
			this.installedPlugins.splice(index, 1);
		}

		this.unloadWithDependents(plugin);

		await fs.remove(plugin.location);
	}

	private syncLock() {
		debug("Acquiring lock ...");

		const lockLocation = path.join(this.options.pluginsPath, "install.lock");
		return new Promise<void>((resolve, reject) => {
			lockFile.lock(lockLocation, { wait: 30000 }, (err) => {
				if (err) {
					debug("Failed to acquire lock", err);
					return reject("Failed to acquire lock");
				}

				resolve();
			});
		});
	}

	private syncUnlock() {
		debug("Releasing lock ...");

		const lockLocation = path.join(this.options.pluginsPath, "install.lock");
		return new Promise<void>((resolve, reject) => {
			lockFile.unlock(lockLocation, (err) => {
				if (err) {
					debug("Failed to release lock", err);
					return reject("Failed to release lock");
				}

				resolve();
			});
		});
	}

	private shouldIgnore(name: string): boolean {
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
}
