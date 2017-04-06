export interface PluginManagerOptions {
    pluginsPath: string;
    npmRegistryUrl: string;
    npmRegistryConfig: any;
}
export declare class PluginManager {
    private readonly options;
    private readonly installedPlugins;
    private readonly registryClient;
    constructor(options?: Partial<PluginManagerOptions>);
    install(name: string, version?: string): Promise<any>;
    uninstall(name: string): Promise<any>;
    list(): Promise<PluginInfo[]>;
    get(name: string): Promise<any>;
    getInfo(name: string): PluginInfo | undefined;
}
export declare class PluginInfo {
    source: string;
    name: string;
    version: string;
}
