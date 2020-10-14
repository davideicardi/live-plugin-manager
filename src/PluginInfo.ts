/**
 * The info of a plugin
 */
export interface IPluginInfo {
	/**
	 * The file that is executed when the plugin is loaded
	 */
	readonly mainFile: string;
	/**
	 * The location of the plugin
	 */
	readonly location: string;
	/**
	 * The name of the plugin
	 */
	readonly name: string;
	/**
	 * The installed version of the plugin
	 */
	readonly version: string;
	/**
	 * The dependencies required by the plugin.
	 * `name` is the name of the plugin.
	 * The value returned from indexing by `name` is the version of the
	 * given dependency.
	 */
	readonly dependencies: { [name: string]: string };
}
