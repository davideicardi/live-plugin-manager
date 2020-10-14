/**
 * The package info found in a `package.json`
 */
export interface PackageJsonInfo extends PackageInfo {
	/**
	 * The file that is executed when the package is loaded
	 */
	main?: string;
	/**
	 * The dependencies required by the package.
	 * `name` is the name of the package.
	 * The value returned from indexing by `name` is the version of the given
	 * dependency.
	 */
	dependencies?: { [name: string]: string };
}

/**
 * The info of a package
 */
export interface PackageInfo {
	/**
	 * The name of the package
	 */
	name: string;
	/**
	 * The installed version of the package
	 */
	version: string;
	/**
	 * The distribution of the package
	 */
	dist?: {
		/**
		 * The distributed tarball
		 */
		tarball: string
	};
}
