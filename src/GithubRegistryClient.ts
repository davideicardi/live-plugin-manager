import * as path from "path";
import * as fs from "./fileSystem";
import * as GitHubApi from "github";
import * as Debug from "debug";
import { downloadTarball, extractTarball } from "./tarballUtils";
import { PackageInfo } from "./NpmRegistryClient";
const debug = Debug("live-plugin-manager.GithubRegistryClient");

export class GithubRegistryClient {
	private readonly gitHubApi = new GitHubApi({followRedirects: false});

	constructor(auth?: GitHubApi.Auth) {
		if (auth) {
			debug(`Authenticating github api with ${auth.type}...`);
			this.gitHubApi.authenticate(auth);
		}
	}

	async get(repository: string): Promise<PackageInfo> {
		const repoInfo = extractRepositoryInfo(repository);

		debug("Repository info: ", repoInfo);

		const response = await this.gitHubApi.repos.getContent({
			...repoInfo,
			path: "package.json"
		});

		const contentBuff = new Buffer(response.data.content, "base64");
		const contentString = contentBuff.toString("utf-8");
		const pkgContent = JSON.parse(contentString) as PackageInfo;
		if (!pkgContent.name || !pkgContent.version) {
			throw new Error("Invalid plugin github repository " + repository);
		}

		debug("Repository package info: ", pkgContent.name, pkgContent.version);

		// https://github.com/jashkenas/underscore/archive/master.zip
		// https://codeload.github.com/jashkenas/underscore/legacy.tar.gz/master
		const archiveLinkResponse = await this.gitHubApi.repos.getArchiveLink({
			...repoInfo,
			archive_format: "tarball"
		});

		const archiveLink = archiveLinkResponse.meta.location;
		if (!(typeof archiveLink === "string")) {
			throw new Error("Invalid archive link");
		}

		debug("Repository package archive: ", archiveLink);

		pkgContent.dist = { tarball: archiveLink };

		return pkgContent;
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

	isGithubRepo(version: string): boolean {
		return version.indexOf("/") > 0;
	}
}

function extractRepositoryInfo(repository: string) {
	const parts = repository.split("/");
	if (parts.length !== 2) {
		throw new Error("Invalid repository name");
	}

	const repoParts = parts[1].split("#");

	const repoInfo = {
		owner: parts[0],
		repo: repoParts[0],
		ref: repoParts[1] || "master"
	};

	return repoInfo;
}
