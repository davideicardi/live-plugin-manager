import { PackageJsonInfo } from "./PackageInfo";
export declare class BitbucketRegistryClient {
    private headers;
    constructor(auth?: BitbucketAuth);
    get(repository: string): Promise<PackageJsonInfo>;
    download(destinationDirectory: string, packageInfo: PackageJsonInfo): Promise<string>;
    isBitbucketRepo(version: string): boolean;
}
export interface BitbucketAuthBasic {
    type: "basic";
    username: string;
    password: string;
}
export type BitbucketAuth = BitbucketAuthBasic;
