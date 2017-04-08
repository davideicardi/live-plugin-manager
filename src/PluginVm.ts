import * as vm from "vm";
import * as fs from "fs-extra";
import * as path from "path";
import {PluginManager} from "./PluginManager";
import * as Debug from "debug";
const debug = Debug("live-plugin-manager.PluginVm");

export class PluginVm {
	constructor(private readonly manager: PluginManager) {
	}

	load(filePath: string): any {
		debug(`Loading ${filePath} ...`);

		if (path.extname(filePath) !== ".js") {
			throw new Error("Invalid javascript file " + filePath);
		}

		const sandbox = this.createModuleSandbox(filePath);
		const moduleContext = vm.createContext(sandbox);

		const code = fs.readFileSync(filePath, "utf8");

		const vmOptions = { displayErrors: true, filename: filePath };
		const script = new vm.Script(code, vmOptions);

		script.runInContext(moduleContext, vmOptions);

		return sandbox.module.exports;
	}

	private createModuleSandbox(filePath: string) {
		const me = this;
		const moduleSandbox = Object.assign({}, this.manager.options.sandbox);
		moduleSandbox.global = global; // TODO this is the real global object, it is fine to do this?
		moduleSandbox.module = { exports: {} };
		moduleSandbox.exports = moduleSandbox.module.exports;
		moduleSandbox.__dirname = path.dirname(filePath);
		moduleSandbox.__filename = filePath;

		moduleSandbox.require = function(name: string) {
			return me.sandboxRequire(path.dirname(filePath), name);
		};

		return moduleSandbox;
	}

	private sandboxRequire(modulePath: string, name: string) {
		// I try to use a similar logic of https://nodejs.org/api/modules.html#modules_modules

		// is a relative module
		if (name.startsWith(".")
			|| name.startsWith("/")
			|| name.startsWith("\\")) {
			const fullPath = path.normalize(path.join(modulePath, name));
			const isFile = this.tryLoadAsFile(fullPath);
			if (isFile.success) {
				return isFile.instance;
			}

			const isDirectory = this.tryLoadAsDirectory(fullPath);
			if (isDirectory.success) {
				return isDirectory.instance;
			}

			throw new Error(`Cannot find ${name} in plugin ${modulePath}`);
		}

		// is another plugin
		const plugin = this.manager.getInfo(name);
		if (plugin != null) {
			return this.manager.require(name);
		}

		// is a core module
		if (this.manager.options.requireCoreModules
			&& require.resolve(name) === name) {
			return require(name);
		}

		if (this.manager.options.requireFallback) {
			return this.manager.options.requireFallback(name);
		}

		throw new Error(`Cannot find ${name} in plugin ${modulePath}`);
	}

	private tryLoadAsFile(fullPath: string): { success: boolean, instance?: any } {
		if (!fs.existsSync(fullPath)) {
			const isJs = this.tryLoadAsFile(fullPath + ".js");
			if (isJs.success) {
				return isJs;
			}

			const isJson = this.tryLoadAsFile(fullPath + ".json");
			if (isJson.success) {
				return isJson;
			}

			return {
				success: false
			};
		}

		const stats = fs.lstatSync(fullPath);
		if (!stats.isDirectory()) {
			return {
				success: true,
				instance: this.load(fullPath)
			};
		}

		return {
			success: false
		};
	}

	private tryLoadAsDirectory(fullPath: string): { success: boolean, instance?: any } {
		if (!fs.existsSync(fullPath)) {
			return {
				success: false
			};
		}

		const indexJs = path.join(fullPath, "index.js");
		if (fs.existsSync(indexJs)) {
			return {
				success: true,
				instance: this.load(indexJs)
			};
		}

		const indexJson = path.join(fullPath, "index.json");
		if (fs.existsSync(indexJson)) {
			return {
				success: true,
				instance: this.load(indexJson)
			};
		}

		return {
			success: false
		};
	}
}
