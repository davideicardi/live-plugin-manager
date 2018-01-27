import { PluginManager } from "./PluginManager";
import { IPluginInfo } from "./PluginInfo";
export declare class PluginVm {
    private readonly manager;
    private requireCache;
    private sandboxCache;
    constructor(manager: PluginManager);
    unload(pluginContext: IPluginInfo): void;
    load(pluginContext: IPluginInfo, filePath: string): any;
    resolve(pluginContext: IPluginInfo, filePath: string): string;
    runScript(code: string): any;
    splitRequire(fullName: string): {
        pluginName: string;
        requiredPath: string | undefined;
    };
    private getScopedInfo(fullName);
    private vmRunScriptInSandbox(moduleSandbox, filePath, code);
    private vmRunScriptInPlugin(pluginContext, filePath, code);
    private getCache(pluginContext, filePath);
    private setCache(pluginContext, filePath, instance);
    private removeCache(pluginContext, filePath);
    private createModuleSandbox(pluginContext, filePath);
    private sandboxResolve(pluginContext, moduleDirName, requiredName);
    private sandboxRequire(pluginContext, moduleDirName, requiredName);
    private isCoreModule(requiredName);
    private isPlugin(requiredName);
    private tryResolveAsFile(fullPath);
    private tryResolveAsDirectory(fullPath);
    private getPluginSandbox(pluginContext);
    private createGlobalSandbox(sandboxTemplate);
}
