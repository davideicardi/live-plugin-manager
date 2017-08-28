/// <reference types="node" />
import { PackageInfo } from "./NpmRegistryClient";
import { PluginInfo, IPluginInfo } from "./PluginInfo";
export interface PluginManagerOptions {
    pluginsPath: string;
    sandbox: any;
    npmRegistryUrl: string;
    npmRegistryConfig: any;
    requireCoreModules: boolean;
    hostRequire?: NodeRequire;
    ignoredDependencies: Array<string | RegExp>;
    staticDependencies: {
        [key: string]: any;
    };
}
export declare class PluginManager {
    readonly options: PluginManagerOptions;
    private readonly vm;
    private readonly installedPlugins;
    private readonly npmRegistry;
    constructor(options?: Partial<PluginManagerOptions>);
    installFromNpm(name: string, version?: string): Promise<IPluginInfo>;
    installFromPath(location: string): Promise<IPluginInfo>;
    uninstall(name: string): Promise<void>;
    uninstallAll(): Promise<void>;
    list(): IPluginInfo[];
    require(name: string): any;
    alreadyInstalled(name: string, version?: string): IPluginInfo | undefined;
    getInfo(name: string): IPluginInfo | undefined;
    getInfoFromNpm(name: string, version?: string): Promise<PackageInfo>;
    runScript(code: string): any;
    getFullInfo(name: string): PluginInfo | undefined;
    private uninstallLockFree(name);
    private installFromPathLockFree(location);
    private installFromNpmLockFree(name, version?);
    private installDependencies(packageInfo);
    private unloadWithDependents(plugin);
    private isModuleAvailableFromHost(name);
    private getPluginLocation(name);
    private removeDownloaded(name);
    private isAlreadyDownloaded(name, version);
    private readPackageJsonFromPath(location);
    private load(plugin);
    private unload(plugin);
    private addPlugin(packageInfo);
    private deleteAndUnloadPlugin(plugin);
    private syncLock();
    private syncUnlock();
    private shouldIgnore(name);
}
