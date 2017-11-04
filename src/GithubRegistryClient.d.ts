import * as GitHubApi from "github";
import { PackageInfo } from "./NpmRegistryClient";
export declare class GithubRegistryClient {
    private readonly gitHubApi;
    constructor(auth?: GitHubApi.Auth);
    get(repository: string): Promise<PackageInfo>;
    download(destinationDirectory: string, packageInfo: PackageInfo): Promise<string>;
    isGithubRepo(version: string): boolean;
}
