/// <reference types="node" />
import { NpmRegistryConfig } from "./NpmRegistryClient";
import { IPluginInfo } from "./PluginInfo";
import { GithubAuth } from "./GithubRegistryClient";
import { PackageInfo } from "./PackageInfo";
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
    setSandboxTemplate(name: string, sandbox: PluginSandbox | undefined): void;
    getSandboxTemplate(name: string): PluginSandbox | undefined;
    alreadyInstalled(name: string, version?: string, mode?: "satisfies" | "satisfiesOrGreater"): IPluginInfo | undefined;
    getInfo(name: string): IPluginInfo | undefined;
    queryPackage(name: string, version?: string): Promise<PackageInfo>;
    queryPackageFromNpm(name: string, version?: string): Promise<PackageInfo>;
    queryPackageFromGithub(repository: string): Promise<PackageInfo>;
    runScript(code: string): any;
    private uninstallLockFree(name);
    private installLockFree(name, version?);
    private installFromPathLockFree(location, options);
    /** Install from npm or from cache if already available */
    private installFromNpmLockFreeCache(name, version?);
    /** Install from npm */
    private installFromNpmLockFreeDirect(name, version?);
    private installFromGithubLockFree(repository);
    private installFromCodeLockFree(name, code, version?);
    private installDependencies(plugin);
    private unloadDependents(pluginName);
    private unloadWithDependents(plugin);
    private isModuleAvailableFromHost(name, version);
    private isValidPluginName(name);
    private validatePluginVersion(version?);
    private getPluginLocation(name);
    private removeDownloaded(name);
    private isAlreadyDownloaded(name, version);
    private getDownloadedPackage(name, version);
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
