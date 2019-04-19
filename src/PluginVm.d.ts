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
    private getScopedInfo;
    private vmRunScriptInSandbox;
    private vmRunScriptInPlugin;
    private getCache;
    private setCache;
    private removeCache;
    private createModuleSandbox;
    private sandboxResolve;
    private sandboxRequire;
    private isCoreModule;
    private isPlugin;
    private tryResolveAsFile;
    private tryResolveAsDirectory;
    private getPluginSandbox;
    private createGlobalSandbox;
}
