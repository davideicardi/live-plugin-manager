import * as urlJoin from "url-join";
import * as path from "path";
import * as fs from "./fileSystem";
import { downloadTarball, extractTarball } from "./tarballUtils";
import * as semVer from "semver";

const RegistryClient = require("npm-registry-client");
const log = require("npmlog");
log.level = "silent"; // disable log for npm-registry-client

export class NpmRegistryClient {
	private readonly registryClient: any;
	private readonly auth?: {token: string, alwaysAuth: boolean};

	constructor(private readonly npmUrl: string, config: NpmRegistryConfig) {
		this.registryClient = new RegistryClient(config);

		if (config.auth) {
			this.auth = {...config.auth, alwaysAuth: true};
		}
	}

	async get(name: string, versionOrTag = "latest"): Promise<PackageInfo> {
		const data = await this.getNpmData(name);
		versionOrTag = versionOrTag.trim();

		// check if there is a tag (es. latest)
		const distTags = data["dist-tags"];
		let version = distTags && distTags[versionOrTag];

		if (!version) {
			version = semVer.clean(versionOrTag) || versionOrTag;
		}

		// find correct version
		let pInfo = data.versions[version];
		if (!pInfo) {
			// find compatible version
			for (const pVersion in data.versions) {
				if (!data.versions.hasOwnProperty(pVersion)) {
					continue;
				}
				const pVersionInfo = data.versions[pVersion];

				if (!semVer.satisfies(pVersionInfo.version, version)) {
					continue;
				}

				if (!pInfo || semVer.gt(pVersionInfo.version, pInfo.version)) {
					pInfo = pVersionInfo;
				}
			}
		}

		if (!pInfo) {
			throw new Error(`Version '${versionOrTag} not found`);
		}

		return {
			_id: pInfo._id,
			dependencies: pInfo.dependencies || {},
			description: pInfo.description || "",
			dist: pInfo.dist,
			main: pInfo.main,
			name: pInfo.name,
			version: pInfo.version
		};
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

	private getNpmData(name: string) {
		return new Promise<NpmData>((resolve, reject) => {
			const params = {timeout: 5000, auth: this.auth};
			const regUrl = urlJoin(this.npmUrl, encodeNpmName(name));
			this.registryClient.get(regUrl, params, (err: any, data: any) => {
				if (err) {
					if (err.message) {
						err.message = `Failed to get package '${name}' ${err.message}`;
					}
					return reject(err);
				}

				if (!data.versions
				|| !data.name) {
					reject(new Error(`Failed to get package '${name}': invalid json format`));
				}

				resolve(data as NpmData);
			});
		});
	}
}

// example: https://registry.npmjs.org/lodash/
// or https://registry.npmjs.org/@types%2Fnode (for scoped)
interface NpmData {
	name: string;
	"dist-tags"?: {
		// "latest": "1.0.0";
		[tag: string]: string;
	};
	versions: {
		[version: string]: {
			_id: string;
			dist: {
				shasum: string;
				tarball: string;
			},
			dependencies: {[name: string]: string}
			name: string,
			description?: string,
			version: string,
			main: string
		}
	};
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

export interface NpmRegistryConfig {
	// actually this is used in the params
	auth?: {
		token: string;
	};

	userAgent?: string;
}
