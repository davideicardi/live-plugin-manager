"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("./fileSystem");
const httpUtils_1 = require("./httpUtils");
const Debug = require("debug");
const tarballUtils_1 = require("./tarballUtils");
const debug = Debug("live-plugin-manager.GithubRegistryClient");
class GithubRegistryClient {
    constructor(auth) {
        if (auth) {
            debug(`Authenticating github api with ${auth.type}...`);
            switch (auth.type) {
                case "token":
                    this.headers = Object.assign({}, httpUtils_1.headersTokenAuth(auth.token), { "user-agent": "live-plugin-manager" });
                    break;
                case "basic":
                    this.headers = Object.assign({}, httpUtils_1.headersBasicAuth(auth.username, auth.password), { "user-agent": "live-plugin-manager" });
                    break;
                default:
                    throw new Error("Auth type not supported");
            }
        }
        else {
            this.headers = {};
        }
    }
    get(repository) {
        return __awaiter(this, void 0, void 0, function* () {
            const repoInfo = extractRepositoryInfo(repository);
            debug("Repository info: ", repoInfo);
            const urlPkg = `https://raw.githubusercontent.com/${repoInfo.owner}/${repoInfo.repo}/${repoInfo.ref}/package.json`;
            const pkgContent = yield httpUtils_1.httpJsonGet(urlPkg, Object.assign({}, this.headers, { accept: "application/vnd.github.v3+json" }));
            if (!pkgContent || !pkgContent.name || !pkgContent.version) {
                throw new Error("Invalid plugin github repository " + repository);
            }
            const urlArchiveLink = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/tarball/${repoInfo.ref}`;
            pkgContent.dist = { tarball: urlArchiveLink };
            return pkgContent;
        });
    }
    download(destinationDirectory, packageInfo) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!packageInfo.dist || !packageInfo.dist.tarball) {
                throw new Error("Invalid dist.tarball property");
            }
            const tgzFile = yield tarballUtils_1.downloadTarball(packageInfo.dist.tarball);
            const pluginDirectory = path.join(destinationDirectory, packageInfo.name);
            try {
                yield tarballUtils_1.extractTarball(tgzFile, pluginDirectory);
            }
            finally {
                yield fs.remove(tgzFile);
            }
            return pluginDirectory;
        });
    }
    isGithubRepo(version) {
        return version.indexOf("/") > 0;
    }
}
exports.GithubRegistryClient = GithubRegistryClient;
function extractRepositoryInfo(repository) {
    const parts = repository.split("/");
    let owner, repo, ref;
    if (repository.indexOf("git://") >= 0) {
        let repoParts = parts[4].split("#");
        owner = parts[3];
        repo = repoParts[0].replace(".git", "");
        ref = repoParts[1];
    }
    else if (parts.length !== 2) {
        throw new Error("Invalid repository name");
    }
    else {
        let repoParts = parts[1].split("#");
        owner = parts[0];
        repo = repoParts[0];
        ref = repoParts[1];
    }
    const repoInfo = {
        owner: owner,
        repo: repo,
        ref: ref || "master"
    };
    return repoInfo;
}
// | AuthOAuthToken
// | AuthOAuthSecret
// | AuthUserToken
// | AuthJWT;
// Implementation using github api
// no more used because the new version doesn't have an easy way to get the download link
// https://github.com/octokit/discussions/issues/12
// import * as path from "path";
// import * as fs from "./fileSystem";
// import * as GitHubApi from "github";
// import * as Debug from "debug";
// import { downloadTarball, extractTarball } from "./tarballUtils";
// import { PackageJsonInfo } from "./PackageInfo";
// const debug = Debug("live-plugin-manager.GithubRegistryClient");
// export class GithubRegistryClient {
// 	private readonly gitHubApi = new GitHubApi({followRedirects: false});
// 	constructor(auth?: GitHubApi.Auth) {
// 		if (auth) {
// 			debug(`Authenticating github api with ${auth.type}...`);
// 			this.gitHubApi.authenticate(auth);
// 		}
// 	}
// 	async get(repository: string): Promise<PackageJsonInfo> {
// 		const repoInfo = extractRepositoryInfo(repository);
// 		debug("Repository info: ", repoInfo);
// 		const response = await this.gitHubApi.repos.getContent({
// 			...repoInfo,
// 			path: "package.json"
// 		});
// 		const contentBuff = new Buffer(response.data.content, "base64");
// 		const contentString = contentBuff.toString("utf-8");
// 		const pkgContent = JSON.parse(contentString) as PackageJsonInfo;
// 		if (!pkgContent.name || !pkgContent.version) {
// 			throw new Error("Invalid plugin github repository " + repository);
// 		}
// 		debug("Repository package info: ", pkgContent.name, pkgContent.version);
// 		// https://github.com/jashkenas/underscore/archive/master.zip
// 		// https://codeload.github.com/jashkenas/underscore/legacy.tar.gz/master
// 		const archiveLinkResponse = await this.gitHubApi.repos.getArchiveLink({
// 			...repoInfo,
// 			archive_format: "tarball"
// 		});
// 		const archiveLink = archiveLinkResponse.meta.location;
// 		if (!(typeof archiveLink === "string")) {
// 			throw new Error("Invalid archive link");
// 		}
// 		debug("Repository package archive: ", archiveLink);
// 		pkgContent.dist = { tarball: archiveLink };
// 		return pkgContent;
// 	}
// 	async download(
// 		destinationDirectory: string,
// 		packageInfo: PackageJsonInfo): Promise<string> {
// 		if (!packageInfo.dist || !packageInfo.dist.tarball) {
// 			throw new Error("Invalid dist.tarball property");
// 		}
// 		const tgzFile = await downloadTarball(packageInfo.dist.tarball);
// 		const pluginDirectory = path.join(destinationDirectory, packageInfo.name);
// 		try {
// 			await extractTarball(tgzFile, pluginDirectory);
// 		} finally {
// 			await fs.remove(tgzFile);
// 		}
// 		return pluginDirectory;
// 	}
// 	isGithubRepo(version: string): boolean {
// 		return version.indexOf("/") > 0;
// 	}
// }
// function extractRepositoryInfo(repository: string) {
// 	const parts = repository.split("/");
// 	if (parts.length !== 2) {
// 		throw new Error("Invalid repository name");
// 	}
// 	const repoParts = parts[1].split("#");
// 	const repoInfo = {
// 		owner: parts[0],
// 		repo: repoParts[0],
// 		ref: repoParts[1] || "master"
// 	};
// 	return repoInfo;
// }
//# sourceMappingURL=GithubRegistryClient.js.map