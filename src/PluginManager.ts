import * as fs from "fs-extra";
import * as path from "path";
import * as url from "url";
import {NpmRegistryClient} from "./NpmRegistryClient";
import * as Debug from "debug";
const debug = Debug("live-plugin-manager");

const BASE_NPM_URL = "https://registry.npmjs.org";

export interface PluginManagerOptions {
	pluginsPath: string;
	npmRegistryUrl: string;
	npmRegistryConfig: any;
}

const cwd = process.cwd();
const DefaultOptions: PluginManagerOptions = {
	npmRegistryUrl: BASE_NPM_URL,
	npmRegistryConfig: {},
	pluginsPath: path.join(cwd, "plugins"),
};


export class PluginManager {
	private readonly options: PluginManagerOptions;

	private readonly installedPlugins = new Array<PluginInfo>();
	private readonly registryClient: NpmRegistryClient;

	constructor(options?: Partial<PluginManagerOptions>) {
		this.options = Object.assign({}, DefaultOptions, options || {});
		this.registryClient = new NpmRegistryClient(this.options.npmRegistryUrl, this.options.npmRegistryConfig);
	}

	async install(name: string, version = "latest"): Promise<any> {
		fs.ensureDirSync(this.options.pluginsPath);

		const registryInfo = await this.registryClient.get(name, version);

		// already installed
		const installedInfo = this.getInfo(name);
		if (installedInfo && installedInfo.version === registryInfo.version) {
			return;
		}

		// TODO check if already downloaded:
		//  if same version return
		// 	if different version uninstall it and continue

		await this.registryClient.download(
			this.options.pluginsPath,
			registryInfo);

		this.installedPlugins.push({
			name: registryInfo.name.toLowerCase(),
			version: registryInfo.version,
			source: "npm"
		});
	}

	async uninstall(name: string): Promise<any> {
		// TODO
	}

	async list(): Promise<PluginInfo[]> {
		return this.installedPlugins;
	}

	async get(name: string): Promise<any> {
		const info = this.getInfo(name);
		if (!info) {
			throw new Error(`${name} not installed`);
		}
		return require(path.join(this.options.pluginsPath, info.name));
	}

	getInfo(name: string): PluginInfo | undefined {
		name = name.toLowerCase();
		return this.installedPlugins.find((p) => p.name === name);
	}
}

export class PluginInfo {
	source: string;
	name: string;
	version: string;
}
