/// <reference types="node" />
import { NpmRegistryConfig } from "./NpmRegistryClient";
import { IPluginInfo } from "./PluginInfo";
import * as GitHubApi from "github";
import { PackageInfo } from "./PackageInfo";
export interface PluginManagerOptions {
    cwd: string;
    pluginsPath: string;
    sandbox: PluginSandbox;
    npmRegistryUrl: string;
    npmRegistryConfig: NpmRegistryConfig;
    requireCoreModules: boolean;
    hostRequire?: NodeRequire;
    ignoredDependencies: Array<string | RegExp>;
    staticDependencies: {
        [key: string]: any;
    };
    githubAuthentication?: GitHubApi.Auth;
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
    constructor(options?: Partial<PluginManagerOptions>);
    install(name: string, version?: string): Promise<IPluginInfo>;
    /**
     * Install a package from npm
     * @param name name of the package
     * @param version version of the package, default to "latest"
     */
    installFromNpm(name: string, version?: string): Promise<IPluginInfo>;
    /**
     * Install a package from a local folder
     * @param location package local folder location
     * @param options options, if options.force == true then package is always reinstalled without version checking
     */
    installFromPath(location: string, options?: Partial<InstallFromPathOptions>): Promise<IPluginInfo>;
    installFromGithub(repository: string): Promise<IPluginInfo>;
    /**
     * Install a package by specifiing code directly. If no version is specified it will be always reinstalled.
     * @param name plugin name
     * @param code code to be loaded, equivalent to index.js
     * @param version optional version, if omitted no version check is performed
     */
    installFromCode(name: string, code: string, version?: string): Promise<IPluginInfo>;
    uninstall(name: string): Promise<void>;
    uninstallAll(): Promise<void>;
    list(): IPluginInfo[];
    require(fullName: string): any;
    alreadyInstalled(name: string, version?: string): IPluginInfo | undefined;
    getInfo(name: string): IPluginInfo | undefined;
    queryPackage(name: string, version?: string): Promise<PackageInfo>;
    queryPackageFromNpm(name: string, version?: string): Promise<PackageInfo>;
    queryPackageFromGithub(repository: string): Promise<PackageInfo>;
    runScript(code: string): any;
    getFullInfo(name: string): IPluginInfo | undefined;
    private uninstallLockFree(name);
    private installLockFree(name, version?);
    private installFromPathLockFree(location, options);
    private installFromNpmLockFree(name, version?);
    private installFromGithubLockFree(repository);
    private installFromCodeLockFree(name, code, version?);
    private installDependencies(plugin);
    private unloadWithDependents(plugin);
    private isModuleAvailableFromHost(name, version);
    private isValidPluginName(name);
    private getPluginLocation(name);
    private removeDownloaded(name);
    private isAlreadyDownloaded(name, version);
    private readPackageJsonFromPath(location);
    private load(plugin, filePath?);
    private unload(plugin);
    private addPlugin(plugin);
    private deleteAndUnloadPlugin(plugin);
    private syncLock();
    private syncUnlock();
    private shouldIgnore(name);
    private createPluginInfo(name);
}
