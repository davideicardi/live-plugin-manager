export declare class NpmRegistryClient {
    private readonly npmUrl;
    private readonly registryClient;
    constructor(npmUrl: string, config: any);
    get(name: string, version?: string): Promise<PackageInfo>;
    download(destinationDirectory: string, packageInfo: PackageInfo): Promise<string>;
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
