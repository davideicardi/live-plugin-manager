import * as WebRequest from "web-request";
import * as fs from "fs-extra";
import * as path from "path";
import * as url from "url";
import * as Debug from "debug";
const debug = Debug("live-plugin-manager");

const Targz = require("tar.gz");

export interface PluginManagerOptions {
	pluginsDirectory: string;
}

export class PluginManager {
	private readonly downloadDirectory: string;
	private readonly installedPlugins = new Array<PluginInfo>();

	constructor(private readonly options: PluginManagerOptions) {
		this.downloadDirectory = path.join(options.pluginsDirectory, ".downloads");
	}

	async install(pluginReference: string): Promise<any> {
		fs.ensureDirSync(this.options.pluginsDirectory);

		const npmUrl = NpmReference.parse(pluginReference);

		const fileTgz = await this.downloadNpmPlugin(npmUrl);
		await this.extractNpmPlugin(fileTgz, npmUrl.id);

		this.installedPlugins.push({
			id: npmUrl.id,
			version: npmUrl.version,
			source: npmUrl
		});
	}

	async uninstall(pluginId: string): Promise<any> {
	}

	async list(): Promise<PluginInfo[]> {
		return this.installedPlugins;
	}

	async get(pluginId: string): Promise<any> {
		return require(path.join(this.options.pluginsDirectory, pluginId));
	}

	private async extractNpmPlugin(tgzFile: string, pluginId: string) {
		debug(`Extracting ${tgzFile} ...`);

		const targz = new Targz({}, {
			strip: 1 // strip the first "package" directory
		});

		await targz.extract(tgzFile, path.join(this.options.pluginsDirectory, pluginId));
	}

	private async downloadNpmPlugin(npmUrl: NpmReference): Promise<string> {
		fs.ensureDirSync(this.downloadDirectory);

		const fileName = npmUrl.fileName;
		const destinationFile = path.join(this.downloadDirectory, fileName);

		// delete file if exists
		if (fs.existsSync(destinationFile)) {
			fs.removeSync(destinationFile);
		}

		debug(`Downloading ${npmUrl.fullUrl} to ${destinationFile} ...`);

		const request = WebRequest.stream(npmUrl.fullUrl);
		const w = fs.createWriteStream(destinationFile);

		request.pipe(w);
		const response = await request.response;

		await new Promise((resolve, reject) => {
			w.on("error", (e: any) => {
				reject(e);
			});
			w.on("finish", () => {
				resolve();
			});
		});

		return destinationFile;
	}
}

export class PluginInfo {
	id: string;
	version: string;
	source: NpmReference;
}

export class NpmReference {
	static parse(fullUrl: string) {
		// assume that url is in this format:
		// https://registry.npmjs.org/lodash/-/lodash-4.17.4.tgz

		const parsedUrl = url.parse(fullUrl);
		if (parsedUrl.hostname !== "registry.npmjs.org") {
			throw new Error("Invalid npm host name");
		}
		if (!parsedUrl.pathname) {
			throw new Error("Invalid npm url");
		}

		const parts = parsedUrl.pathname.split("/");
		const id = parts[1];
		const fileName = path.basename(parsedUrl.pathname);
		const extension = path.extname(fileName);
		const version = fileName.replace(`${id}-`, "").replace(extension, "");

		if (id.indexOf(".") >= 0) {
			throw new Error("Invalid npm url");
		}
		if (!version || !id || !fileName) {
			throw new Error("Invalid npm url");
		}

		return {
			fullUrl,
			id,
			version,
			fileName
		};
	}

	fullUrl: string;
	id: string;
	version: string;
	fileName: string;
}
