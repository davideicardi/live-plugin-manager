import * as GitHubApi from "github";
import { PackageJsonInfo } from "./PackageInfo";
export declare class GithubRegistryClient {
    private readonly gitHubApi;
    constructor(auth?: GitHubApi.Auth);
    get(repository: string): Promise<PackageJsonInfo>;
    download(destinationDirectory: string, packageInfo: PackageJsonInfo): Promise<string>;
    isGithubRepo(version: string): boolean;
}
