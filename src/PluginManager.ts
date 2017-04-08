import * as fs from "fs-extra";
import * as path from "path";
import * as url from "url";
import {NpmRegistryClient, PackageInfo} from "./NpmRegistryClient";
import {PluginVm} from "./PluginVm";
import {PluginInfo} from "./PluginInfo";
import * as Debug from "debug";
const debug = Debug("live-plugin-manager");

const BASE_NPM_URL = "https://registry.npmjs.org";

export interface PluginManagerOptions {
	pluginsPath: string;
	sandbox: any;
	npmRegistryUrl: string;
	npmRegistryConfig: any;
	requireCoreModules: boolean;
	requireFallback?: NodeRequire;
}

const cwd = process.cwd();
const DefaultOptions: PluginManagerOptions = {
	npmRegistryUrl: BASE_NPM_URL,
	sandbox: {},
	npmRegistryConfig: {},
	pluginsPath: path.join(cwd, "plugins"),
	requireCoreModules: true,
	requireFallback: undefined
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
		fs.ensureDirSync(this.options.pluginsPath);

		const registryInfo = await this.npmRegistry.get(name, version);

		// already installed
		const installedInfo = this.getInfo(name);
		if (installedInfo && installedInfo.version === registryInfo.version) {
			return installedInfo;
		}

		// already downloaded
		if (!this.isAlreadyDownloaded(registryInfo.name, registryInfo.version)) {
			this.removeDownloaded(registryInfo.name);

			const location = await this.npmRegistry.download(
				this.options.pluginsPath,
				registryInfo);
		}

		return await this.install(registryInfo);
	}

	async installFromPath(location: string): Promise<PluginInfo> {
		fs.ensureDirSync(this.options.pluginsPath);

		const packageJson = this.readPackageJson(location);

		// already installed
		const installedInfo = this.getInfo(packageJson.name);
		if (installedInfo && installedInfo.version === packageJson.version) {
			return installedInfo;
		}

		// already downloaded
		if (!this.isAlreadyDownloaded(packageJson.name, packageJson.version)) {
			this.removeDownloaded(packageJson.name);

			debug(`Copy from ${location} to ${this.options.pluginsPath}`);
			fs.copySync(location, this.getPluginLocation(packageJson.name));
		}

		return await this.install(packageJson);
	}

	async uninstall(name: string): Promise<void> {
		const info = this.getInfo(name);
		if (!info) {
			return;
		}

		const index = this.installedPlugins.indexOf(info);
		if (index >= 0) {
			this.installedPlugins.splice(index, 1);
		}

		await this.unload(info);

		fs.removeSync(info.location);
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

	private async installDependencies(packageInfo: PackageInfo): Promise<void> {
		if (!packageInfo.dependencies) {
			return;
		}

		for (const key in packageInfo.dependencies) {
			if (packageInfo.dependencies.hasOwnProperty(key)) {
				const version = packageInfo.dependencies[key].toString();

				if (this.isModuleAvailable(key)) {
					debug(`Skipping dependency ${key} of ${packageInfo.name}, is already installed`);
				} else {
					debug(`Installing dependency ${key} of ${packageInfo.name}, is already installed`);
					await this.installFromNpm(key, version);
				}
			}
		}
	}

	private isModuleAvailable(name: string): boolean {
		try {
			require.resolve(name);
			return true;
		} catch (e) {
			return false;
		}
	}

	private getPluginLocation(name: string) {
		return path.join(this.options.pluginsPath, name);
	}

	private removeDownloaded(name: string) {
		const location = this.getPluginLocation(name);
		if (!fs.existsSync(location)) {
			fs.removeSync(location);
		}
	}

	private isAlreadyDownloaded(name: string, version: string): boolean {
		const location = this.getPluginLocation(name);
		if (!fs.existsSync(location)) {
			return false;
		}

		try {
			const packageJson = this.readPackageJson(location);

			return (packageJson.name === name && packageJson.version === version);
		} catch (e) {
			return false;
		}
	}

	private readPackageJson(location: string): PackageInfo {
		const packageJsonFile = path.join(location, "package.json");
		if (!fs.existsSync(packageJsonFile)) {
			throw new Error(`Invalid plugin ${location}, package.json is missing`);
		}
		const packageJson = JSON.parse(fs.readFileSync(packageJsonFile, "utf8"));

		if (!packageJson.name
			|| !packageJson.version) {
			throw new Error(
				`Invalid plugin ${location}, 'main', 'name' and 'version' properties are required in package.json`);
		}

		return packageJson;
	}

	private async load(plugin: PluginInfo): Promise<void> {
		plugin.instance = this.vm.load(plugin, plugin.mainFile);
	}

	private async unload(plugin: PluginInfo): Promise<void> {
		plugin.instance = undefined;
	}

	private async install(packageInfo: PackageInfo): Promise<PluginInfo> {
		await this.installDependencies(packageInfo);

		const location = this.getPluginLocation(packageInfo.name);
		const pluginInfo = {
			name: packageInfo.name,
			version: packageInfo.version,
			location,
			mainFile: path.normalize(path.join(location, packageInfo.main || "index.js"))
		};

		await this.load(pluginInfo);
		this.installedPlugins.push(pluginInfo);

		return pluginInfo;
	}
}
