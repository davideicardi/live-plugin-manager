/// <reference types="node" />
import { PluginInfo } from "./PluginInfo";
export interface PluginManagerOptions {
    pluginsPath: string;
    sandbox: any;
    npmRegistryUrl: string;
    npmRegistryConfig: any;
    requireCoreModules: boolean;
    requireFallback?: NodeRequire;
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
    list(): Promise<PluginInfo[]>;
    require(name: string): any;
    getInfo(name: string): PluginInfo | undefined;
    private load(plugin);
    private unload(plugin);
    private install(pluginInfo);
}
