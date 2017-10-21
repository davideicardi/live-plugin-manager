import * as urlJoin from "url-join";
import * as path from "path";
import * as os from "os";
import * as fs from "./fileSystem";
import * as request from "request";
import * as Debug from "debug";
const debug = Debug("live-plugin-manager.NpmRegistryClient");

const Targz = require("tar.gz");
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

		const tgzFile = await this.downloadTarball(packageInfo.dist.tarball);

		const pluginDirectory = path.join(destinationDirectory, packageInfo.name);
		await this.extractTarball(tgzFile, pluginDirectory);

		await fs.remove(tgzFile);

		return pluginDirectory;
	}

	private async extractTarball(tgzFile: string, destinationDirectory: string) {
		debug(`Extracting ${tgzFile} to ${destinationDirectory} ...`);

		const targz = new Targz({}, {
			strip: 1 // strip the first "package" directory
		});

		await targz.extract(tgzFile, destinationDirectory);
	}

	private async downloadTarball(url: string): Promise<string> {
		const destinationFile = path.join(os.tmpdir(), Date.now().toString() + ".tgz");

		// delete file if exists
		if (await fs.exists(destinationFile)) {
			await fs.remove(destinationFile);
		}

		debug(`Downloading ${url} to ${destinationFile} ...`);

		await httpDownload(url, destinationFile);

		return destinationFile;
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

function httpDownload(sourceUrl: string, destinationFile: string): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		const fileStream = fs.createWriteStream(destinationFile);
		request
			.get(sourceUrl)
			.on("error", (err) => {
				fileStream.close();
				fs.remove(destinationFile);
				reject(err);
			})
			.pipe(fileStream);

		fileStream.on("finish", function() {
			fileStream.close();
			resolve();
		});
	});

	// code without using request...
	// return new Promise<void>((resolve, reject) => {
	// 	const fileStream = fs.createWriteStream(destinationFile);
	// 	const httpGet = (sourceUrl.toLowerCase().startsWith("https") ? https.get : http.get);
	// 	const request = httpGet(sourceUrl, function(response) {
	// 		response.pipe(fileStream);
	// 		fileStream.on("finish", function() {
	// 			fileStream.close();
	// 			resolve();
	// 		});
	// 	})
	// 	.on("error", function(err) {
	// 		fileStream.close();
	// 		fs.remove(destinationFile);
	// 		reject(err);
	// 	});
	// });
}

function encodeNpmName(name: string) {
	return name.replace("/", "%2F");
}

function normalizeVersion(name: string, version: string): string {
	if (name.startsWith("@")) { // is scoped
		// npm api seems to have some problems with scoped packages
		// https://github.com/npm/registry/issues/34
		// Here I try a workaround
		if (version === "latest") {
			return "*"; // TODO I'n not sure it is the same...
		}

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
