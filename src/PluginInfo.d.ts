import * as SemVer from "semver";
import { VersionRange, VersionRef, SatisfyMode } from "./VersionRef";
export interface IPluginInfo {
    readonly mainFile: string;
    readonly location: string;
    readonly name: PluginName;
    readonly version: PluginVersion;
    readonly requestedVersion: VersionRef;
    readonly dependencies: Map<PluginName, VersionRef>;
    satisfies(name: PluginName, version?: PluginVersion | VersionRange, mode?: SatisfyMode): boolean;
    satisfiesVersion(version: PluginVersion | VersionRange, mode?: SatisfyMode): boolean;
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
export declare class PluginInfo {
    readonly mainFile: string;
    readonly location: string;
    readonly name: PluginName;
    readonly version: PluginVersion;
    readonly requestedVersion: VersionRef;
    readonly dependencies: Map<PluginName, VersionRef>;
    constructor(mainFile: string, location: string, name: PluginName, version: PluginVersion, requestedVersion: VersionRef, dependencies: Map<PluginName, VersionRef>);
    satisfies(name: PluginName, version?: PluginVersion | VersionRange, mode?: SatisfyMode): boolean;
    satisfiesVersion(version: PluginVersion | VersionRange, mode?: SatisfyMode): boolean;
}
