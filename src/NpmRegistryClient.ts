import * as urlJoin from "url-join";
import * as path from "path";
import * as fs from "./fileSystem";
import { downloadTarball, extractTarball } from "./tarballUtils";

const RegistryClient = require("npm-registry-client");
const log = require("npmlog");
log.level = "silent"; // disable log for npm-registry-client

export class NpmRegistryClient {
	private readonly registryClient: any;

	constructor(private readonly npmUrl: string, config: any) {
		this.registryClient = new RegistryClient(config);
	}

	get(name: string, version = "latest"): Promise<PackageInfo> {
		return new Promise((resolve, reject) => {
			const params = {timeout: 5000};
			const regUrl = urlJoin(this.npmUrl, encodeNpmName(name), normalizeVersion(name, version));
			this.registryClient.get(regUrl, params, (err: any, data: any) => {
				if (err) {
					if (err.message) {
						err.message = `Failed to get package '${name}:${version}' ${err.message}`;
					}
					return reject(err);
				}

				// TODO Check if data is valid?

				resolve(data as PackageInfo);
			});
		});
	}

	async download(
		destinationDirectory: string,
		packageInfo: PackageInfo): Promise<string> {

		if (!packageInfo.dist || !packageInfo.dist.tarball) {
			throw new Error("Invalid dist.tarball property");
		}

		const tgzFile = await downloadTarball(packageInfo.dist.tarball);

		const pluginDirectory = path.join(destinationDirectory, packageInfo.name);
		await extractTarball(tgzFile, pluginDirectory);

		await fs.remove(tgzFile);

		return pluginDirectory;
	}

}

export interface PackageInfo {
	_id?: string;
	name: string;
	description: string;
	version: string;
	main?: string;
	dependencies?: any;
	dist?: {
		tarball: string
	};
}

function encodeNpmName(name: string) {
	return name.replace("/", "%2F");
}

function normalizeVersion(name: string, version: string): string {

	version = (version || "").trim() || "latest";

	if (name.startsWith("@")) { // is scoped
		// npm api seems to have some problems with scoped packages
		// https://github.com/npm/registry/issues/34
		// Here I try a workaround
		if (version === "latest") {
			return "*"; // TODO I'n not sure it is the same...
		}

		// add = if no other operators are specified
		if (isNumber(version[0])) {
			return "=" + encodeURIComponent(version);
		}

		return encodeURIComponent(version);
	}

	return encodeURIComponent(version);
}

function isNumber(c: string): boolean {
	return (c >= "0" && c <= "9");
}
