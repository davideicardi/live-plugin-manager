export declare class PluginInfo implements IPluginInfo {
    readonly mainFile: string;
    readonly location: string;
    readonly name: string;
    readonly version: string;
    instance?: any;
}
export declare class IPluginInfo {
    readonly mainFile: string;
    readonly location: string;
    readonly name: string;
    readonly version: string;
}
