import { PackageJsonInfo } from "./PackageInfo";
export declare class GithubRegistryClient {
    private headers;
    constructor(auth?: GithubAuth);
    get(repository: string): Promise<PackageJsonInfo>;
    download(destinationDirectory: string, packageInfo: PackageJsonInfo): Promise<string>;
    isGithubRepo(version: string): boolean;
}
export interface GithubAuthUserToken {
    type: "token";
    token: string;
}
export interface GithubAuthBasic {
    type: "basic";
    username: string;
    password: string;
}
export declare type GithubAuth = GithubAuthUserToken | GithubAuthBasic;
