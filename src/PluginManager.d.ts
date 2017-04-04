export interface PluginManagerOptions {
    pluginsDirectory: string;
}
export declare class PluginManager {
    private readonly options;
    private readonly downloadDirectory;
    private readonly installedPlugins;
    constructor(options: PluginManagerOptions);
    install(pluginReference: string): Promise<any>;
    uninstall(pluginId: string): Promise<any>;
    list(): Promise<PluginInfo[]>;
    get(pluginId: string): Promise<any>;
    private extractNpmPlugin(tgzFile, pluginId);
    private downloadNpmPlugin(npmUrl);
}
export declare class PluginInfo {
    id: string;
    version: string;
    source: NpmReference;
}
export declare class NpmReference {
    static parse(fullUrl: string): {
        fullUrl: string;
        id: string;
        version: string;
        fileName: string;
    };
    fullUrl: string;
    id: string;
    version: string;
    fileName: string;
}
