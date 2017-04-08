import * as fs from "fs-extra";
import * as path from "path";
import * as url from "url";
import {NpmRegistryClient} from "./NpmRegistryClient";
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

		// TODO check if already downloaded:
		//  if same version return
		// 	if different version uninstall it and continue

		const location = await this.npmRegistry.download(
			this.options.pluginsPath,
			registryInfo);

		const pluginInfo = {
			name: normalizeName(registryInfo.name),
			version: registryInfo.version,
			mainFile: path.join(location, registryInfo.main),
			source: "npm",
			location
		};

		await this.install(pluginInfo);

		return pluginInfo;
	}

	async installFromPath(location: string): Promise<PluginInfo> {
		fs.ensureDirSync(this.options.pluginsPath);

		const packageJsonFile = path.join(location, "package.json");
		if (!fs.existsSync(packageJsonFile)) {
			throw new Error(`Invalid plugin ${location}, package.json is missing`);
		}
		const packageJson = JSON.parse(fs.readFileSync(packageJsonFile, "utf8"));

		if (!packageJson.main
			|| !packageJson.name
			|| !packageJson.version) {
			throw new Error(
				`Invalid plugin ${location}, 'main', 'name' and 'version' properties are required in package.json`);
		}

		fs.copySync(location, this.options.pluginsPath);

		const pluginInfo = {
			name: normalizeName(packageJson.name),
			version: packageJson.version,
			mainFile: path.join(location, packageJson.main),
			source: "path",
			location
		};

		await this.install(pluginInfo);

		return pluginInfo;
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
		name = normalizeName(name);
		return this.installedPlugins.find((p) => p.name === name);
	}

	private async load(plugin: PluginInfo): Promise<void> {
		plugin.instance = this.vm.load(plugin.mainFile);
	}

	private async unload(plugin: PluginInfo): Promise<void> {
		plugin.instance = undefined;
	}

	private async install(pluginInfo: PluginInfo) {
		await this.load(pluginInfo);
		this.installedPlugins.push(pluginInfo);
	}
}

function normalizeName(name: string) {
	if (!name) {
		throw new Error("Invalid plugin name");
	}
	return name.toLowerCase();
}
