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
const urlJoin = require("url-join");
const path = require("path");
const fs = require("./fileSystem");
const tarballUtils_1 = require("./tarballUtils");
const semVer = require("semver");
const httpUtils = require("./httpUtils");
const Debug = require("debug");
const debug = Debug("live-plugin-manager.NpmRegistryClient");
class NpmRegistryClient {
    constructor(npmUrl, config) {
        this.npmUrl = npmUrl;
        const staticHeaders = {
            // https://github.com/npm/registry/blob/master/docs/responses/package-metadata.md
            "accept-encoding": "gzip",
            "accept": "application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*",
            "user-agent": config.userAgent || "live-plugin-manager"
        };
        const authHeader = createAuthHeader(config.auth);
        this.defaultHeaders = Object.assign({}, staticHeaders, authHeader);
    }
    get(name, versionOrTag = "latest") {
        return __awaiter(this, void 0, void 0, function* () {
            debug(`Getting npm info for ${name}:${versionOrTag}...`);
            if (typeof versionOrTag !== "string") {
                versionOrTag = "";
            }
            if (typeof name !== "string") {
                throw new Error("Invalid package name");
            }
            const data = yield this.getNpmData(name);
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
                dist: pInfo.dist,
                name: pInfo.name,
                version: pInfo.version
            };
        });
    }
    download(destinationDirectory, packageInfo) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!packageInfo.dist || !packageInfo.dist.tarball) {
                throw new Error("Invalid dist.tarball property");
            }
            const tgzFile = yield tarballUtils_1.downloadTarball(packageInfo.dist.tarball, this.defaultHeaders);
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
    getNpmData(name) {
        return __awaiter(this, void 0, void 0, function* () {
            const regUrl = urlJoin(this.npmUrl, encodeNpmName(name));
            const headers = this.defaultHeaders;
            try {
                const result = yield httpUtils.httpJsonGet(regUrl, headers);
                if (!result) {
                    throw new Error("Response is empty");
                }
                if (!result.versions
                    || !result.name) {
                    throw new Error("Invalid json format");
                }
                return result;
            }
            catch (err) {
                if (err.message) {
                    err.message = `Failed to get package '${name}' ${err.message}`;
                }
                throw err;
            }
        });
    }
}
exports.NpmRegistryClient = NpmRegistryClient;
function encodeNpmName(name) {
    return name.replace("/", "%2F");
}
function createAuthHeader(auth) {
    if (!auth) {
        return {};
    }
    if (isTokenAuth(auth)) {
        return httpUtils.headersBearerAuth(auth.token); // this should be a JWT I think...
    }
    else if (isBasicAuth(auth)) {
        return httpUtils.headersBasicAuth(auth.username, auth.password);
    }
    else {
        return {};
    }
}
function isTokenAuth(arg) {
    return arg.token !== undefined;
}
function isBasicAuth(arg) {
    return arg.username !== undefined;
}
//# sourceMappingURL=NpmRegistryClient.js.map