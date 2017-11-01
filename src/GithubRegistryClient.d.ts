import { PackageInfo } from "./NpmRegistryClient";
export declare class GithubRegistryClient {
    private readonly gitHubApi;
    get(repository: string): Promise<PackageInfo>;
    download(destinationDirectory: string, packageInfo: PackageInfo): Promise<string>;
}
