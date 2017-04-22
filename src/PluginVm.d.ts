import { PluginManager } from "./PluginManager";
import { IPluginInfo } from "./PluginInfo";
export declare class PluginVm {
    private readonly manager;
    private requireCache;
    constructor(manager: PluginManager);
    load(pluginContext: IPluginInfo, filePath: string): any;
    runScript(code: string): any;
    private vmRunScript(pluginContext, filePath, code);
    private getCache(pluginContext, filePath);
    private setCache(pluginContext, filePath, instance);
    private createModuleSandbox(pluginContext, filePath);
    private sandboxResolve(pluginContext, moduleDirName, name);
    private sandboxRequire(pluginContext, moduleDirName, name);
    private isCoreModule(name);
    private isPlugin(name);
    private tryResolveAsFile(fullPath);
    private tryResolveAsDirectory(fullPath);
}
