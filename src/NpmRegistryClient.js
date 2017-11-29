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
const RegistryClient = require("npm-registry-client");
const log = require("npmlog");
log.level = "silent"; // disable log for npm-registry-client
class NpmRegistryClient {
    constructor(npmUrl, config) {
        this.npmUrl = npmUrl;
        this.registryClient = new RegistryClient(config);
        if (config.auth) {
            this.auth = Object.assign({}, config.auth, { alwaysAuth: true });
        }
    }
    get(name, versionOrTag = "latest") {
        return __awaiter(this, void 0, void 0, function* () {
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
                _id: pInfo._id,
                dependencies: pInfo.dependencies || {},
                description: pInfo.description || "",
                dist: pInfo.dist,
                main: pInfo.main,
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
            const tgzFile = yield tarballUtils_1.downloadTarball(packageInfo.dist.tarball);
            const pluginDirectory = path.join(destinationDirectory, packageInfo.name);
            yield tarballUtils_1.extractTarball(tgzFile, pluginDirectory);
            yield fs.remove(tgzFile);
            return pluginDirectory;
        });
    }
    getNpmData(name) {
        return new Promise((resolve, reject) => {
            const params = { timeout: 5000, auth: this.auth };
            const regUrl = urlJoin(this.npmUrl, encodeNpmName(name));
            this.registryClient.get(regUrl, params, (err, data) => {
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
                resolve(data);
            });
        });
    }
}
exports.NpmRegistryClient = NpmRegistryClient;
function encodeNpmName(name) {
    return name.replace("/", "%2F");
}
//# sourceMappingURL=NpmRegistryClient.js.map