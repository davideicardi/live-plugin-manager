import * as httpUtils from "./httpUtils";
import { PackageInfo } from "./PackageInfo";
export declare class NpmRegistryClient {
    private readonly npmUrl;
    defaultHeaders: httpUtils.Headers;
    constructor(npmUrl: string, config: NpmRegistryConfig);
    get(name: string, versionOrTag?: string | null): Promise<PackageInfo>;
    download(destinationDirectory: string, packageInfo: PackageInfo): Promise<string>;
    private getNpmData(name);
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
