import * as vm from "vm";
import * as fs from "fs-extra";
import * as path from "path";
import {PluginManager} from "./PluginManager";
import {PluginInfo} from "./PluginInfo";
import * as Debug from "debug";
const debug = Debug("live-plugin-manager.PluginVm");

export class PluginVm {
	private requireCache = new Map<PluginInfo, Map<string, any>>();

	constructor(private readonly manager: PluginManager) {
	}

	load(pluginContext: PluginInfo, filePath: string): any {
		let moduleInstance = this.getCache(pluginContext, filePath);
		if (moduleInstance) {
			debug(`${filePath} loaded from cache`);
			return moduleInstance;
		}

		debug(`Loading ${filePath} ...`);

		if (path.extname(filePath) !== ".js") {
			throw new Error("Invalid javascript file " + filePath);
		}

		const sandbox = this.createModuleSandbox(pluginContext, filePath);
		const moduleContext = vm.createContext(sandbox);

		const code = fs.readFileSync(filePath, "utf8");

		const vmOptions = { displayErrors: true, filename: filePath };
		const script = new vm.Script(code, vmOptions);

		script.runInContext(moduleContext, vmOptions);

		moduleInstance = sandbox.module.exports;
		this.setCache(pluginContext, filePath, moduleInstance);

		return moduleInstance;
	}

	private getCache(pluginContext: PluginInfo, filePath: string): any {
		const moduleCache = this.requireCache.get(pluginContext);
		if (!moduleCache) {
			return undefined;
		}

		return moduleCache.get(filePath);
	}

	private setCache(pluginContext: PluginInfo, filePath: string, instance: any): void {
		let moduleCache = this.requireCache.get(pluginContext);
		if (!moduleCache) {
			moduleCache = new Map<string, any>();
			this.requireCache.set(pluginContext, moduleCache);
		}

		moduleCache.set(filePath, instance);
	}

	private createModuleSandbox(pluginContext: PluginInfo, filePath: string) {
		const me = this;
		const moduleSandbox = Object.assign({}, this.manager.options.sandbox);
		moduleSandbox.global = global; // TODO this is the real global object, it is fine to do this?
		moduleSandbox.module = { exports: {} };
		moduleSandbox.exports = moduleSandbox.module.exports;
		moduleSandbox.__dirname = path.dirname(filePath);
		moduleSandbox.__filename = filePath;

		moduleSandbox.require = function(name: string) {
			return me.sandboxRequire(pluginContext, name);
		};

		return moduleSandbox;
	}

	private sandboxResolve(pluginContext: PluginInfo, name: string): string {
		// I try to use a similar logic of https://nodejs.org/api/modules.html#modules_modules

		// is a relative module
		if (name.startsWith(".")
			|| name.startsWith(path.sep)) {
			const fullPath = path.normalize(path.join(pluginContext.location, name));

			if (!fullPath.startsWith(pluginContext.location)) {
				throw new Error("Cannot require a module outside a plugin");
			}

			const isFile = this.tryLoadAsFile(pluginContext, fullPath);
			if (isFile) {
				return isFile;
			}

			const isDirectory = this.tryLoadAsDirectory(pluginContext, fullPath);
			if (isDirectory) {
				return isDirectory;
			}

			throw new Error(`Cannot find ${name} in plugin ${pluginContext.name}`);
		}

		if (this.isPlugin(name)) {
			return name;
		}

		if (this.isCoreModule(name)) {
			return name;
		}

		if (this.manager.options.requireFallback) {
			return this.manager.options.requireFallback.resolve(name);
		}

		throw new Error(`Cannot find ${name} in plugin ${pluginContext.name}`);
	}

	private sandboxRequire(pluginContext: PluginInfo, name: string) {
		// I try to use a similar logic of https://nodejs.org/api/modules.html#modules_modules

		const fullName = this.sandboxResolve(pluginContext, name);

		// is a file
		if (fullName.indexOf(path.sep) >= 0) {
			return this.load(pluginContext, fullName);
		}

		if (this.isPlugin(name)) {
			return this.manager.require(name);
		}

		if (this.isCoreModule(name)) {
			return require(name);
		}

		if (this.manager.options.requireFallback) {
			return this.manager.options.requireFallback(name);
		}

		throw new Error(`Cannot find ${name} in plugin ${pluginContext.name}`);
	}

	private isCoreModule(name: string): boolean {
		return this.manager.options.requireCoreModules
			&& require.resolve(name) === name;
	}

	private isPlugin(name: string): boolean {
		return !!this.manager.getInfo(name);
	}

	private tryLoadAsFile(pluginContext: PluginInfo, fullPath: string): string | undefined {
		if (!fs.existsSync(fullPath)) {
			const isJs = this.tryLoadAsFile(pluginContext, fullPath + ".js");
			if (isJs) {
				return isJs;
			}

			const isJson = this.tryLoadAsFile(pluginContext, fullPath + ".json");
			if (isJson) {
				return isJson;
			}

			return undefined;
		}

		const stats = fs.lstatSync(fullPath);
		if (!stats.isDirectory()) {
			return fullPath;
		}

		return undefined;
	}

	private tryLoadAsDirectory(pluginContext: PluginInfo, fullPath: string): string | undefined {
		if (!fs.existsSync(fullPath)) {
			return undefined;
		}

		const indexJs = path.join(fullPath, "index.js");
		if (fs.existsSync(indexJs)) {
			return indexJs;
		}

		const indexJson = path.join(fullPath, "index.json");
		if (fs.existsSync(indexJson)) {
			return indexJson;
		}

		return undefined;
	}
}
