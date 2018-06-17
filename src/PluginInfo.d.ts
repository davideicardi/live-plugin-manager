import * as SemVer from "semver";
import { VersionRef, SatisfyMode } from "./VersionRef";
export interface PluginDependency {
    name: PluginName;
    versionRef: VersionRef;
    resolvedAs?: IPluginInfo;
    resolvedMode?: "ignored" | "fromHost" | "fromPlugin";
}
export interface IPluginInfo {
    readonly mainFile: string;
    readonly location: string;
    readonly name: PluginName;
    readonly version: PluginVersion;
    readonly requestedVersion: VersionRef;
    readonly dependencies: PluginDependency[];
    satisfies(name: PluginName, version?: PluginVersion | VersionRef, mode?: SatisfyMode): boolean;
    satisfiesVersion(version: PluginVersion | VersionRef, mode?: SatisfyMode): boolean;
}
export declare class PluginName {
    readonly raw: string;
    static tryParse(value?: string | PluginName): PluginName | undefined;
    static parse(value?: string | PluginName): PluginName;
    static is(value: PluginName): value is PluginName;
    private readonly isPluginName;
    protected constructor(raw: string);
    toString(): string;
}
export declare class PluginVersion {
    readonly semver: SemVer.SemVer;
    static tryParse(value?: string | PluginVersion): PluginVersion | undefined;
    static parse(value?: string | PluginVersion): PluginVersion;
    static is(value: any): value is PluginVersion;
    protected constructor(semver: SemVer.SemVer);
    toString(): string;
}
export declare class PluginInfo implements IPluginInfo {
    readonly mainFile: string;
    readonly location: string;
    readonly name: PluginName;
    readonly version: PluginVersion;
    readonly requestedVersion: VersionRef;
    readonly dependencies: PluginDependency[];
    constructor(mainFile: string, location: string, name: PluginName, version: PluginVersion, requestedVersion: VersionRef, dependencies: PluginDependency[]);
    satisfies(name: PluginName, version?: PluginVersion | VersionRef, mode?: SatisfyMode): boolean;
    satisfiesVersion(version: PluginVersion | VersionRef, mode?: SatisfyMode): boolean;
    private satisfiesVersionRange;
}
export declare function pluginCompare(a: IPluginInfo, b: IPluginInfo): number;
