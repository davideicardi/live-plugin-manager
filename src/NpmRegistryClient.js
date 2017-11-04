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
const Debug = require("debug");
const tarballUtils_1 = require("./tarballUtils");
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
                    if (err.message) {
                        err.message = `Failed to get package '${name}:${version}' ${err.message}`;
                    }
                    return reject(err);
                }
                // TODO Check if data is valid?
                resolve(data);
            });
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
exports.NpmRegistryClient = NpmRegistryClient;
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
        // add = if no other operators are specified
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