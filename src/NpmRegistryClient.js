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
const WebRequest = require("web-request");
const urlJoin = require("url-join");
const path = require("path");
const os = require("os");
const uuid = require("uuid");
const fs = require("fs-extra");
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
            const regUrl = urlJoin(this.npmUrl, name, version);
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
            fs.removeSync(tgzFile);
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
            const destinationFile = path.join(os.tmpdir(), uuid.v4() + ".tgz");
            // delete file if exists
            if (fs.existsSync(destinationFile)) {
                fs.removeSync(destinationFile);
            }
            debug(`Downloading ${url} to ${destinationFile} ...`);
            const request = WebRequest.stream(url);
            const w = fs.createWriteStream(destinationFile);
            request.pipe(w);
            const response = yield request.response;
            yield new Promise((resolve, reject) => {
                w.on("error", (e) => {
                    reject(e);
                });
                w.on("finish", () => {
                    resolve();
                });
            });
            return destinationFile;
        });
    }
}
exports.NpmRegistryClient = NpmRegistryClient;
//# sourceMappingURL=NpmRegistryClient.js.map