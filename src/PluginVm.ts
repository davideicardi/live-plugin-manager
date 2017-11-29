import * as vm from "vm";
import * as fs from "fs-extra";
import * as path from "path";
import {PluginManager} from "./PluginManager";
import {IPluginInfo} from "./PluginInfo";
import * as Debug from "debug";
const debug = Debug("live-plugin-manager.PluginVm");

export class PluginVm {
	private requireCache = new Map<IPluginInfo, Map<string, any>>();

	constructor(private readonly manager: PluginManager) {
	}

	unload(pluginContext: IPluginInfo): void {
		this.requireCache.delete(pluginContext);
	}

	load(pluginContext: IPluginInfo, filePath: string): any {
		let moduleInstance = this.getCache(pluginContext, filePath);
		if (moduleInstance) {
			debug(`${filePath} loaded from cache`);
			return moduleInstance;
		}

		debug(`Loading ${filePath} ...`);

		const filePathExtension = path.extname(filePath).toLowerCase();
		if (filePathExtension === ".js") {
			const code = fs.readFileSync(filePath, "utf8");

			moduleInstance = this.vmRunScript(pluginContext, filePath, code);
		} else if (filePathExtension === ".json") {
			moduleInstance = fs.readJsonSync(filePath);
		} else {
			throw new Error("Invalid javascript file " + filePath);
		}

		this.setCache(pluginContext, filePath, moduleInstance);

		return moduleInstance;
	}

	resolve(pluginContext: IPluginInfo, filePath: string): string {
		return this.sandboxResolve(pluginContext, pluginContext.location, filePath);
	}

	runScript(code: string): any {
		const name = "dynamic-" + Date.now;
		const filePath = path.join(this.manager.options.pluginsPath, name + ".js");
		const pluginContext: IPluginInfo = {
			location: path.join(this.manager.options.pluginsPath, name),
			mainFile: filePath,
			name,
			version: "1.0.0",
			dependencies: {}
		};

		return this.vmRunScript(pluginContext, filePath, code);
	}

	splitRequire(fullName: string) {
		const slashPosition = fullName.indexOf("/");
		let requiredPath: string | undefined;
		let pluginName = fullName;
		if (slashPosition > 0) {
			pluginName = fullName.substring(0, slashPosition);
			requiredPath = "." + fullName.substring(slashPosition);
		}

		return { pluginName, requiredPath };
	}

	private vmRunScript(pluginContext: IPluginInfo, filePath: string, code: string): any {
		const sandbox = this.createModuleSandbox(pluginContext, filePath);
		const moduleContext = vm.createContext(sandbox);

		// For performance reasons wrap code in a Immediately-invoked function expression
		// https://60devs.com/executing-js-code-with-nodes-vm-module.html
		// I have also declared the exports variable to support the
		//  `var app = exports = module.exports = {};` notation
		const newLine = "\r\n";
		const iifeCode = `(function(exports){${newLine}${code}${newLine}}(module.exports));`;

		const vmOptions = { displayErrors: true, filename: filePath };
		const script = new vm.Script(iifeCode, vmOptions);

		script.runInContext(moduleContext, vmOptions);

		return sandbox.module.exports;
	}

	private getCache(pluginContext: IPluginInfo, filePath: string): any {
		const moduleCache = this.requireCache.get(pluginContext);
		if (!moduleCache) {
			return undefined;
		}

		return moduleCache.get(filePath);
	}

	private setCache(pluginContext: IPluginInfo, filePath: string, instance: any): void {
		let moduleCache = this.requireCache.get(pluginContext);
		if (!moduleCache) {
			moduleCache = new Map<string, any>();
			this.requireCache.set(pluginContext, moduleCache);
		}

		moduleCache.set(filePath, instance);
	}

	private createModuleSandbox(pluginContext: IPluginInfo, filePath: string) {
		// tslint:disable-next-line:no-this-assignment
		const me = this;
		const moduleSandbox = {...this.manager.options.sandbox};

		// see https://nodejs.org/api/globals.html
		moduleSandbox.global = moduleSandbox;
		moduleSandbox.Buffer = Buffer;
		moduleSandbox.console = console; // TODO Maybe I can override the console ??
		moduleSandbox.clearImmediate = clearImmediate;
		moduleSandbox.clearInterval = clearInterval;
		moduleSandbox.clearTimeout = clearTimeout;
		moduleSandbox.setImmediate = setImmediate;
		moduleSandbox.setInterval = setInterval;
		moduleSandbox.setTimeout = setTimeout;
		moduleSandbox.process = process;
		moduleSandbox.module = { exports: {} };
		// moduleSandbox.exports = moduleSandbox.module.exports; // I have declared it in the code itself
		moduleSandbox.__dirname = path.dirname(filePath);
		moduleSandbox.__filename = filePath;

		moduleSandbox.require = function(requiredName: string) {
			return me.sandboxRequire(pluginContext, moduleSandbox.__dirname, requiredName);
		};

		return moduleSandbox;
	}

	private sandboxResolve(pluginContext: IPluginInfo, moduleDirName: string, requiredName: string): string {
		// I try to use a similar logic of https://nodejs.org/api/modules.html#modules_modules

		// is a relative module
		if (requiredName.startsWith(".")) {
			const fullPath = path.normalize(path.join(moduleDirName, requiredName));

			// for security reason check to not load external files
			if (!fullPath.startsWith(pluginContext.location)) {
				throw new Error("Cannot require a module outside a plugin");
			}

			const isFile = this.tryResolveAsFile(fullPath);
			if (isFile) {
				return isFile;
			}

			const isDirectory = this.tryResolveAsDirectory(fullPath);
			if (isDirectory) {
				return isDirectory;
			}

			throw new Error(`Cannot find ${requiredName} in plugin ${pluginContext.name}`);
		}

		if (this.isPlugin(requiredName)) {
			return requiredName;
		}

		if (this.manager.options.staticDependencies[requiredName]) {
			return requiredName;
		}

		// this will fail if module is unknown
		if (this.isCoreModule(requiredName)) {
			return requiredName;
		}

		return requiredName;
	}

	private sandboxRequire(pluginContext: IPluginInfo, moduleDirName: string, requiredName: string) {
		// I try to use a similar logic of https://nodejs.org/api/modules.html#modules_modules

		debug(`Requiring '${requiredName}'...`);

		const fullName = this.sandboxResolve(pluginContext, moduleDirName, requiredName);

		// is an absolute file or directory that can be loaded
		if (path.isAbsolute(fullName)) {
			debug(`Resolved ${requiredName} as file ${fullName}`);
			return this.load(pluginContext, fullName);
		}

		if (this.manager.options.staticDependencies[requiredName]) {
			debug(`Resolved ${requiredName} as static dependency`);
			return this.manager.options.staticDependencies[requiredName];
		}

		if (this.isPlugin(requiredName)) {
			debug(`Resolved ${requiredName} as plugin`);
			return this.manager.require(requiredName);
		}

		if (this.isCoreModule(requiredName)) {
			debug(`Resolved ${requiredName} as core module`);
			return require(requiredName);
		}

		if (this.manager.options.hostRequire) {
			debug(`Resolved ${requiredName} as host module`);
			return this.manager.options.hostRequire(requiredName);
		}

		throw new Error(`Module ${requiredName} not found, failed to load plugin ${pluginContext.name}`);
	}

	private isCoreModule(requiredName: string): boolean {
		return this.manager.options.requireCoreModules
			&& require.resolve(requiredName) === requiredName;
	}

	private isPlugin(requiredName: string): boolean {
		const { pluginName } = this.splitRequire(requiredName);

		return !!this.manager.getInfo(pluginName);
	}

	private tryResolveAsFile(fullPath: string): string | undefined {
		if (!fs.existsSync(fullPath)) {
			const isJs = this.tryResolveAsFile(fullPath + ".js");
			if (isJs) {
				return isJs;
			}

			const isJson = this.tryResolveAsFile(fullPath + ".json");
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

	private tryResolveAsDirectory(fullPath: string): string | undefined {
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
