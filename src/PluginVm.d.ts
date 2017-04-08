import { PluginManager } from "./PluginManager";
export declare class PluginVm {
    private readonly manager;
    constructor(manager: PluginManager);
    load(filePath: string): any;
    private createModuleSandbox(filePath);
    private sandboxRequire(modulePath, name);
    private tryLoadAsFile(fullPath);
    private tryLoadAsDirectory(fullPath);
}
