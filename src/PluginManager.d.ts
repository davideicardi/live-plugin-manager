/// <reference types="node" />
import { PluginInfo, IPluginInfo } from "./PluginInfo";
export interface PluginManagerOptions {
    pluginsPath: string;
    sandbox: any;
    npmRegistryUrl: string;
    npmRegistryConfig: any;
    requireCoreModules: boolean;
    hostRequire?: NodeRequire;
}
export declare class PluginManager {
    readonly options: PluginManagerOptions;
    private readonly vm;
    private readonly installedPlugins;
    private readonly npmRegistry;
    constructor(options?: Partial<PluginManagerOptions>);
    installFromNpm(name: string, version?: string): Promise<PluginInfo>;
    installFromPath(location: string): Promise<PluginInfo>;
    uninstall(name: string): Promise<void>;
    uninstallAll(): Promise<void>;
    list(): IPluginInfo[];
    require(name: string): any;
    getInfo(name: string): IPluginInfo | undefined;
    private uninstallLockFree(name);
    private installFromPathLockFree(location);
    private installFromNpmLockFree(name, version?);
    private installDependencies(packageInfo);
    private isModuleAvailableFromHost(name);
    private getPluginLocation(name);
    private removeDownloaded(name);
    private isAlreadyDownloaded(name, version);
    private readPackageJsonFromPath(location);
    private load(plugin);
    private unload(plugin);
    private install(packageInfo);
    private syncLock();
    private syncUnlock();
}
