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
const os = require("os");
const fs = require("./fileSystem");
const http = require("http");
const https = require("https");
const Debug = require("debug");
const debug = Debug("live-plugin-manager.NpmRegistryClient");
const Targz = require("tar.gz");
const RegistryClient = require("npm-registry-client");
const log = require("npmlog");
log.level = "silent"; // disable log for npm-registry-client
class NpmRegistryClient {
    constructor(npmUrl, config) {
        this.npmUrl = npmUrl;
        this.registryClient = new RegistryClient(config);
    }
    get(name, version = "latest") {
        return new Promise((resolve, reject) => {
            const params = { timeout: 5000 };
            const regUrl = urlJoin(this.npmUrl, encodeNpmName(name), normalizeVersion(name, version));
            this.registryClient.get(regUrl, params, (err, data) => {
                if (err) {
                    return reject(err);
                }
                resolve(data);
            });
        });
    }
    download(destinationDirectory, packageInfo) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!packageInfo.dist.tarball) {
                throw new Error("Invalid dist.tarball property");
            }
            const tgzFile = yield this.downloadTarball(packageInfo.dist.tarball);
            const pluginDirectory = path.join(destinationDirectory, packageInfo.name);
            yield this.extractTarball(tgzFile, pluginDirectory);
            yield fs.remove(tgzFile);
            return pluginDirectory;
        });
    }
    extractTarball(tgzFile, destinationDirectory) {
        return __awaiter(this, void 0, void 0, function* () {
            debug(`Extracting ${tgzFile} to ${destinationDirectory} ...`);
            const targz = new Targz({}, {
                strip: 1 // strip the first "package" directory
            });
            yield targz.extract(tgzFile, destinationDirectory);
        });
    }
    downloadTarball(url) {
        return __awaiter(this, void 0, void 0, function* () {
            const destinationFile = path.join(os.tmpdir(), Date.now().toString() + ".tgz");
            // delete file if exists
            if (yield fs.exists(destinationFile)) {
                yield fs.remove(destinationFile);
            }
            debug(`Downloading ${url} to ${destinationFile} ...`);
            yield httpDownload(url, destinationFile);
            return destinationFile;
        });
    }
}
exports.NpmRegistryClient = NpmRegistryClient;
function httpDownload(sourceUrl, destinationFile) {
    return new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream(destinationFile);
        const httpGet = (sourceUrl.toLowerCase().startsWith("https") ? https.get : http.get);
        const request = httpGet(sourceUrl, function (response) {
            response.pipe(fileStream);
            fileStream.on("finish", function () {
                fileStream.close();
                resolve();
            });
        })
            .on("error", function (err) {
            fileStream.close();
            fs.remove(destinationFile);
            reject(err);
        });
    });
}
function encodeNpmName(name) {
    return name.replace("/", "%2F");
}
function normalizeVersion(name, version) {
    if (name.startsWith("@")) {
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
function isNumber(c) {
    return (c >= "0" && c <= "9");
}
//# sourceMappingURL=NpmRegistryClient.js.map