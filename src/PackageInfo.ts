export interface PackageJsonInfo extends PackageInfo {
	main?: string;
	dependencies?: { [name: string]: string };
	optionalDependencies?: { [name: string]: string };
}

export interface PackageInfo {
	name: string;
	version: string;
	dist?: {
		tarball: string
	};
}
