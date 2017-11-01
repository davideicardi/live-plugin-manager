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
const GitHubApi = require("github");
const Debug = require("debug");
const tarballUtils_1 = require("./tarballUtils");
const debug = Debug("live-plugin-manager.GithubRegistryClient");
class GithubRegistryClient {
    constructor() {
        this.gitHubApi = new GitHubApi({ followRedirects: false });
    }
    get(repository) {
        return __awaiter(this, void 0, void 0, function* () {
            const repoInfo = extractRepositoryInfo(repository);
            debug("Repository info: ", repoInfo);
            const response = yield this.gitHubApi.repos.getContent(Object.assign({}, repoInfo, { path: "package.json" }));
            const contentBuff = new Buffer(response.data.content, "base64");
            const contentString = contentBuff.toString("utf-8");
            const pkgContent = JSON.parse(contentString);
            if (!pkgContent.name || !pkgContent.version) {
                throw new Error("Invalid plugin github repository " + repository);
            }
            debug("Repository package info: ", pkgContent.name, pkgContent.version);
            const archiveLinkResponse = yield this.gitHubApi.repos.getArchiveLink(Object.assign({}, repoInfo, { archive_format: "tarball" }));
            const archiveLink = archiveLinkResponse.meta.location;
            if (!(typeof archiveLink === "string")) {
                throw new Error("Invalid archive link");
            }
            debug("Repository package archive: ", archiveLink);
            pkgContent.dist = { tarball: archiveLink };
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
            yield tarballUtils_1.extractTarball(tgzFile, pluginDirectory);
            yield fs.remove(tgzFile);
            return pluginDirectory;
        });
    }
}
exports.GithubRegistryClient = GithubRegistryClient;
function extractRepositoryInfo(repository) {
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
//# sourceMappingURL=GithubRegistryClient.js.map