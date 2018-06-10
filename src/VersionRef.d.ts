import * as SemVer from "semver";
import { PluginVersion } from "./PluginInfo";
export declare type SatisfyMode = "satisfies" | "satisfiesOrGreater";
export interface VersionRef {
    readonly raw: string;
}
export declare abstract class NpmVersionRef implements VersionRef {
    readonly raw: string;
    static tryParse(value?: string | NpmVersionRef | PluginVersion): NpmVersionRef | undefined;
    static parse(value?: string | NpmVersionRef | PluginVersion): NpmVersionRef;
    static is(value: any): value is NpmVersionRef;
    private readonly isNpmVersionRef;
    protected constructor(raw: string);
}
export declare class GitHubRef implements VersionRef {
    readonly raw: string;
    static tryParse(value: string | GitHubRef): GitHubRef | undefined;
    static parse(value: string | GitHubRef): GitHubRef;
    static is(versionRef: VersionRef): versionRef is GitHubRef;
    private readonly isGitHubRef;
    protected constructor(raw: string);
    getInfo(): {
        owner: string;
        repo: string;
        ref: string;
    };
}
export declare class VersionRange extends NpmVersionRef {
    readonly range: SemVer.Range;
    static tryParse(value: string | VersionRange | PluginVersion): VersionRange | undefined;
    static parse(value: string | VersionRange | PluginVersion): VersionRange;
    static is(value: any): value is VersionRange;
    private readonly isVersionRange;
    protected constructor(range: SemVer.Range);
}
export declare class DistTag extends NpmVersionRef {
    readonly raw: string;
    static readonly LATEST: DistTag;
    static tryParse(value: string | DistTag): DistTag | undefined;
    static parse(value: string | DistTag): DistTag;
    static is(versionRef: VersionRef): versionRef is DistTag;
    private readonly isDistTag;
    protected constructor(raw: string);
}
export declare function parseVersionRef(rawValue?: string | VersionRef): VersionRef;
export declare function tryParseVersionRef(rawValue?: string | VersionRef): VersionRef | undefined;
