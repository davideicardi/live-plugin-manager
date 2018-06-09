import * as httpUtils from "./httpUtils";
import { PackageInfo } from "./PackageInfo";
import { NpmVersionRef } from "./VersionRef";
export declare class NpmRegistryClient {
    private readonly npmUrl;
    defaultHeaders: httpUtils.Headers;
    constructor(npmUrl: string, config: NpmRegistryConfig);
    get(name: string, npmVersionRef: NpmVersionRef): Promise<PackageInfo>;
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
