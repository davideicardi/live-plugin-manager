export class IPluginInfo {
	readonly mainFile: string;
	readonly location: string;
	readonly name: string;
	readonly version: string;
	readonly dependencies: { [name: string]: string };
}
