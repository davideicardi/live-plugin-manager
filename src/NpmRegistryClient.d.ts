export declare class NpmRegistryClient {
    private readonly npmUrl;
    private readonly registryClient;
    private readonly auth?;
    constructor(npmUrl: string, config: NpmRegistryConfig);
    get(name: string, versionOrTag?: string): Promise<PackageInfo>;
    download(destinationDirectory: string, packageInfo: PackageInfo): Promise<string>;
    private getNpmData(name);
}
export interface PackageInfo {
    _id?: string;
    name: string;
    description: string;
    version: string;
    main?: string;
    dependencies?: any;
    dist?: {
        tarball: string;
    };
}
export interface NpmRegistryConfig {
    auth?: {
        token: string;
    };
    userAgent?: string;
}
