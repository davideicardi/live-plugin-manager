export declare type PackageDependencyList = {
    [name: string]: string;
};
export interface PackageJsonInfo extends PackageInfo {
    main?: string;
    dependencies?: PackageDependencyList;
    peerDependencies?: PackageDependencyList;
}
export interface PackageInfo {
    name: string;
    version: string;
    dist?: {
        tarball: string;
    };
}
