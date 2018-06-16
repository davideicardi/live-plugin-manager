import { PackageJsonInfo } from "./PackageInfo";
import { GitHubRef } from "./VersionRef";
export declare class GithubRegistryClient {
    private headers;
    constructor(auth?: GithubAuth);
    get(gitHubRef: GitHubRef): Promise<PackageJsonInfo>;
    download(pluginDirectory: string, packageInfo: PackageJsonInfo): Promise<string>;
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
