import * as httpUtils from "./httpUtils";
import { PackageInfo } from "./PackageInfo";
import { NpmVersionRef } from "./VersionRef";
import { PluginName } from "./PluginInfo";
export declare class NpmRegistryClient {
    private readonly npmUrl;
    defaultHeaders: httpUtils.Headers;
    constructor(npmUrl: string, config: NpmRegistryConfig);
    get(name: PluginName, npmVersionRef: NpmVersionRef): Promise<PackageInfo>;
    download(destinationDirectory: string, packageInfo: PackageInfo): Promise<string>;
    private getNpmData;
}
export interface NpmRegistryConfig {
    auth?: NpmRegistryAuthToken | NpmRegistryAuthBasic;
    userAgent?: string;
}
export interface NpmRegistryAuthToken {
    token: string;
}
export interface NpmRegistryAuthBasic {
    username: string;
    password: string;
}
