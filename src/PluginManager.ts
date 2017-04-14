import * as fs from "./fileSystem";
import * as path from "path";
import * as url from "url";
import {NpmRegistryClient, PackageInfo} from "./NpmRegistryClient";
import {PluginVm} from "./PluginVm";
import {PluginInfo} from "./PluginInfo";
import * as lockFile from "lockfile";
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
}

const cwd = process.cwd();
const DefaultOptions: PluginManagerOptions = {
	npmRegistryUrl: BASE_NPM_URL,
	sandbox: {},
	npmRegistryConfig: {},
	pluginsPath: path.join(cwd, "plugins"),
	requireCoreModules: true,
	hostRequire: require
};


export class PluginManager {
	readonly options: PluginManagerOptions;
	private readonly vm: PluginVm;
	private readonly installedPlugins = new Array<PluginInfo>();
	private readonly npmRegistry: NpmRegistryClient;

	constructor(options?: Partial<PluginManagerOptions>) {
		this.options = Object.assign({}, DefaultOptions, options || {});
		this.vm = new PluginVm(this);
		this.npmRegistry = new NpmRegistryClient(this.options.npmRegistryUrl, this.options.npmRegistryConfig);
	}

	async installFromNpm(name: string, version = "latest"): Promise<PluginInfo> {
		await fs.ensureDir(this.options.pluginsPath);

		await this.syncLock();
		try {
			return await this.installFromNpmLockFree(name, version);
		} finally {
			await this.syncUnlock();
		}
	}

	async installFromPath(location: string): Promise<PluginInfo> {
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
			for (const plugin of this.installedPlugins.slice().reverse()) {
				await this.uninstallLockFree(plugin.name);
			}
		} finally {
			await this.syncUnlock();
		}
	}

	async list(): Promise<PluginInfo[]> {
		return this.installedPlugins;
	}

	require(name: string): any {
		const info = this.getInfo(name);
		if (!info) {
			throw new Error(`${name} not installed`);
		}
		return info.instance;
	}

	getInfo(name: string): PluginInfo | undefined {
		return this.installedPlugins.find((p) => p.name === name);
	}

	private async uninstallLockFree(name: string): Promise<void> {
		debug(`Uninstalling ${name}...`);

		const info = this.getInfo(name);
		if (!info) {
			debug(`${name} not installed`);
			return;
		}

		const index = this.installedPlugins.indexOf(info);
		if (index >= 0) {
			this.installedPlugins.splice(index, 1);
		}

		this.unload(info);

		await fs.remove(info.location);
	}

	private async installFromPathLockFree(location: string): Promise<PluginInfo> {
		const packageJson = await this.readPackageJsonFromPath(location);

		// already installed
		const installedInfo = this.getInfo(packageJson.name);
		if (installedInfo && installedInfo.version === packageJson.version) {
			return installedInfo;
		}

		// already downloaded
		if (!(await this.isAlreadyDownloaded(packageJson.name, packageJson.version))) {
			await this.removeDownloaded(packageJson.name);

			debug(`Copy from ${location} to ${this.options.pluginsPath}`);
			await fs.copy(location, this.getPluginLocation(packageJson.name));
		}

		return await this.install(packageJson);
	}

	private async installFromNpmLockFree(name: string, version = "latest"): Promise<PluginInfo> {
		const registryInfo = await this.npmRegistry.get(name, version);

		// already installed
		const installedInfo = this.getInfo(name);
		if (installedInfo && installedInfo.version === registryInfo.version) {
			return installedInfo;
		}

		// already downloaded
		if (!(await this.isAlreadyDownloaded(registryInfo.name, registryInfo.version))) {
			await this.removeDownloaded(registryInfo.name);

			await this.npmRegistry.download(
				this.options.pluginsPath,
				registryInfo);
		}

		return await this.install(registryInfo);
	}

	private async installDependencies(packageInfo: PackageInfo): Promise<void> {
		if (!packageInfo.dependencies) {
			return;
		}

		for (const key in packageInfo.dependencies) {
			if (packageInfo.dependencies.hasOwnProperty(key)) {
				const version = packageInfo.dependencies[key].toString();

				if (this.isModuleAvailableFromHost(key)) {
					debug(`Installing dependencies of ${packageInfo.name}: ${key} is already installed`);
				} else {
					debug(`Installing dependencies of ${packageInfo.name}: ${key} ...`);
					await this.installFromNpmLockFree(key, version);
				}
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
		plugin.instance = this.vm.load(plugin, plugin.mainFile);
	}

	private unload(plugin: PluginInfo) {
		plugin.instance = undefined;
	}

	private async install(packageInfo: PackageInfo): Promise<PluginInfo> {
		await this.installDependencies(packageInfo);

		const DefaultMainFile = "index.js";
		const DefaultMainFileExtension = ".js";

		const location = this.getPluginLocation(packageInfo.name);
		const pluginInfo = {
			name: packageInfo.name,
			version: packageInfo.version,
			location,
			mainFile: path.normalize(path.join(location, packageInfo.main || DefaultMainFile))
		};

		// If no extensions for main file is used, just default to .js
		if (!path.extname(pluginInfo.mainFile)) {
			pluginInfo.mainFile += DefaultMainFileExtension;
		}

		this.load(pluginInfo);
		this.installedPlugins.push(pluginInfo);

		return pluginInfo;
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
}
