import { PluginManager } from "./PluginManager";
import { PluginInfo } from "./PluginInfo";
export declare class PluginVm {
    private readonly manager;
    private requireCache;
    constructor(manager: PluginManager);
    load(pluginContext: PluginInfo, filePath: string): any;
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
