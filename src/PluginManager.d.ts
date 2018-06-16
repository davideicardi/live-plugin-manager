/// <reference types="node" />
import { NpmRegistryConfig } from "./NpmRegistryClient";
import { IPluginInfo, PluginName, PluginVersion } from "./PluginInfo";
import { GithubAuth } from "./GithubRegistryClient";
import { PackageInfo } from "./PackageInfo";
import { VersionRef, VersionRange, GitHubRef, NpmVersionRef, SatisfyMode } from "./VersionRef";
export interface PluginManagerOptions {
    cwd: string;
    pluginsPath: string;
    sandbox: PluginSandbox;
    npmRegistryUrl: string;
    npmRegistryConfig: NpmRegistryConfig;
    npmInstallMode: "useCache" | "noCache";
    requireCoreModules: boolean;
    hostRequire?: NodeRequire;
    ignoredDependencies: Array<string | RegExp>;
    staticDependencies: {
        [key: string]: any;
    };
    githubAuthentication?: GithubAuth;
    lockWait: number;
    lockStale: number;
}
export interface PluginSandbox {
    env?: NodeJS.ProcessEnv;
    global?: NodeJS.Global;
}
export interface InstallFromPathOptions {
    force: boolean;
}
export declare class PluginManager {
    readonly options: PluginManagerOptions;
    private readonly vm;
    private readonly installedPlugins;
    private readonly npmRegistry;
    private readonly githubRegistry;
    private readonly sandboxTemplates;
    constructor(options?: Partial<PluginManagerOptions>);
    install(name: PluginName | string, versionRef?: VersionRef | string): Promise<IPluginInfo>;
    /**
     * Install a package from npm
     * @param name name of the package
     * @param version version of the package, default to "latest"
     */
    installFromNpm(name: string, versionRef?: NpmVersionRef | string): Promise<IPluginInfo>;
    /**
     * Install a package from a local folder
     * @param location package local folder location
     * @param options options, if options.force == true then package is always reinstalled without version checking
     */
    installFromPath(location: string, options?: Partial<InstallFromPathOptions>): Promise<IPluginInfo>;
    installFromGithub(gitHubRef: GitHubRef | string): Promise<IPluginInfo>;
    /**
     * Install a package by specifiing code directly. If no version is specified it will be always reinstalled.
     * @param name plugin name
     * @param code code to be loaded, equivalent to index.js
     * @param version optional version, if omitted no version check is performed
     */
    installFromCode(name: PluginName | string, code: string, version?: PluginVersion | string): Promise<IPluginInfo>;
    uninstall(name: PluginName | string, version?: PluginVersion | string): Promise<void>;
    uninstallAll(): Promise<void>;
    list(): IPluginInfo[];
    require(fullName: string): any;
    setSandboxTemplate(name: PluginName | string, sandbox: PluginSandbox | undefined): void;
    getSandboxTemplate(name: PluginName | string): PluginSandbox | undefined;
    alreadyInstalled(name: PluginName | string, version?: PluginVersion | VersionRef | string, mode?: SatisfyMode): IPluginInfo | undefined;
    getInfo(name: PluginName | string, version?: PluginVersion | VersionRange): IPluginInfo | undefined;
    queryPackage(name: PluginName | string, versionRef?: VersionRef | string): Promise<PackageInfo>;
    queryPackageFromNpm(name: PluginName | string, versionRef?: NpmVersionRef | string): Promise<PackageInfo>;
    queryPackageFromGithub(repository: GitHubRef | string): Promise<PackageInfo>;
    runScript(code: string): any;
    private uninstallLockFree;
    private installLockFree;
    private installFromPathLockFree;
    private installFromNpmLockFree;
    private installFromGithubLockFree;
    private installFromCodeLockFree;
    private tryInstallFromCache;
    private installDependencies;
    private unloadDependents;
    private unloadWithDependents;
    private isModuleAvailableFromHost;
    private getPluginLocation;
    private removeDownloaded;
    private isAlreadyDownloaded;
    private getDownloadedPackages;
    private getDownloadedPackage;
    private readPackageJsonFromPath;
    private load;
    private unload;
    private addPlugin;
    private deleteAndUnloadPlugin;
    private syncLock;
    private syncUnlock;
    private shouldIgnore;
    private createPluginInfo;
}
