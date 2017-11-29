import * as httpUtils from "./httpUtils";
import { PackageInfo } from "./PackageInfo";
export declare class NpmRegistryClient {
    private readonly npmUrl;
    defaultHeaders: httpUtils.Headers;
    constructor(npmUrl: string, config: NpmRegistryConfig);
    get(name: string, versionOrTag?: string): Promise<PackageInfo>;
    download(destinationDirectory: string, packageInfo: PackageInfo): Promise<string>;
    private getNpmData(name);
}
export interface NpmRegistryConfig {
    auth?: {
        token: string;
    };
    userAgent?: string;
}
