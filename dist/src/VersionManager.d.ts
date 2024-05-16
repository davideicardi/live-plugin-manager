import { IPluginInfo } from "./PluginInfo";
import { PackageJsonInfo, PackageInfo } from "./PackageInfo";
export interface VersionManagerOptions {
    cwd: string;
    rootPath: string;
}
export declare const DefaultMainFile = "index.js";
/**
 * A class to manage the versions of the downloaded packages.
 */
export declare class VersionManager {
    readonly options: VersionManagerOptions;
    constructor(options?: Partial<VersionManagerOptions>);
    /**
     * Ensure the root path exists.
     */
    ensureRootPath(): Promise<void>;
    /**
     * Get the location for the specified package name and version.
     *
     * @param packageInfo A package information to get the location
     * @returns A location for the specified package name and version
     */
    getPath(packageInfo: PackageInfo): string;
    /**
     * Resolve the path for the specified package name and version.
     *
     * @param name A package name to resolve
     * @param version A package version to resolve
     * @returns
     */
    resolvePath(name: string, version: string): Promise<string | undefined>;
    /**
     * Download a package using a downloader.
     * Downloaded files are stored in the rootPath as directory named as `name@version`.
     *
     * @param downloader A downloader object that implements the download method
     * @param registryInfo A package info to download
     * @returns A information for the downloaded package
     */
    download(downloader: {
        download: (destinationDirectory: string, registryInfo: PackageJsonInfo) => Promise<string>;
    }, registryInfo: PackageJsonInfo): Promise<PackageJsonInfo>;
    /**
     * Uninstall packages which are not used by other packages.
     *
     * @param installedPlugins A list of the installed packages.
     * @returns A list of the uninstalled packages.
     */
    uninstallOrphans(installedPlugins: Array<IPluginInfo>): Promise<IPluginInfo[]>;
    /**
     * Unload a version of a plugin if it is not used by any other plugin
     *
     * @param pluginInfo A plugin information to uninstall
     * @returns true if the version was unloaded, false if it was used by another plugin
     */
    uninstallOrphan(pluginInfo: IPluginInfo): Promise<boolean>;
    /**
     * Create a plugin information for the specified version.
     *
     * @param name A package name
     * @param version A package version
     * @param withDependencies A flag to load dependency packages
     * @returns A plugin information for the specified version
     */
    createVersionInfo(name: string, version: string, withDependencies?: boolean): Promise<IPluginInfo>;
    /**
     * Create a plugin information for the specified path.
     *
     * @param location A path to the package directory
     * @param withDependencies A flag to load dependency packages
     * @returns A plugin information for the specified path
     */
    createVersionInfoFromPath(location: string, withDependencies?: boolean): Promise<IPluginInfo>;
    /**
     * Check whether the filename is satisfied with the specified package name and version.
     *
     * @param filename A filename to check
     * @param name A package name to check
     * @param version A package version to check
     * @returns true if the filename is satisfied with the specified package name and version, otherwise false
     */
    private checkModuleFilenameSatisfied;
    /**
     * Get the package information from the package directory.
     *
     * @param location A path to the package directory
     * @returns A package information for the package directory
     */
    private readPackageJsonFromPath;
    /**
     * List package directories in the specified base directory.
     *
     * @param baseDir A base directory to list
     * @param scope A scope for packages
     * @returns A list of the package directories
     */
    private listVersionDirs;
    /**
     * Check whether the package is used by other packages.
     *
     * @param packageInfo A package information to check
     * @param baseDir A base directory to check. If not specified, the rootPath is used.
     * @returns true if the package is used by other packages, otherwise false
     */
    private checkVersionUsedInDir;
    /**
     * Check whether the package is used by the specified package.
     *
     * @param packageInfo A package information to check
     * @param packageDir A package directory to check
     * @returns true if the package is used by the specified package, otherwise false
     */
    private checkVersionUsedFromPackage;
    /**
     * Uninstall all of the orphaned packages.
     *
     * @param installedPlugins A list of the installed packages
     * @returns A list of the uninstalled packages
     */
    private uninstallOrphansLockFree;
    /**
     * Remove the specified version.
     *
     * @param pluginInfo A plugin information to remove
     */
    private removeVersion;
}
