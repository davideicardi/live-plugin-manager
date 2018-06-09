import * as SemVer from "semver";
export interface IPluginInfo {
    readonly mainFile: string;
    readonly location: string;
    readonly name: string;
    readonly version: string;
    readonly dependencies: {
        [name: string]: string;
    };
}
export declare class PluginName {
    readonly raw: string;
    static tryParse(value?: string | PluginName): PluginName | undefined;
    static parse(value?: string | PluginName): PluginName;
    static is(value: PluginName): value is PluginName;
    private readonly isPluginName;
    protected constructor(raw: string);
}
export declare class PluginVersion {
    readonly semver: SemVer.SemVer;
    static tryParse(value?: string | PluginVersion): PluginVersion | undefined;
    static parse(value?: string | PluginVersion): PluginVersion;
    static is(value: PluginVersion): value is PluginVersion;
    protected constructor(semver: SemVer.SemVer);
}
