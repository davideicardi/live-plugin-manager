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
const fs = require("fs-extra");
const path = require("path");
const url = require("url");
const Debug = require("debug");
const debug = Debug("live-plugin-manager");
const Targz = require("tar.gz");
class PluginManager {
    constructor(options) {
        this.options = options;
        this.installedPlugins = new Array();
        this.downloadDirectory = path.join(options.pluginsDirectory, ".downloads");
    }
    install(pluginReference) {
        return __awaiter(this, void 0, void 0, function* () {
            fs.ensureDirSync(this.options.pluginsDirectory);
            const npmUrl = NpmReference.parse(pluginReference);
            const fileTgz = yield this.downloadNpmPlugin(npmUrl);
            yield this.extractNpmPlugin(fileTgz, npmUrl.id);
            this.installedPlugins.push({
                id: npmUrl.id,
                version: npmUrl.version,
                source: npmUrl
            });
        });
    }
    uninstall(pluginId) {
        return __awaiter(this, void 0, void 0, function* () {
        });
    }
    list() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.installedPlugins;
        });
    }
    get(pluginId) {
        return __awaiter(this, void 0, void 0, function* () {
            return require(path.join(this.options.pluginsDirectory, pluginId));
        });
    }
    extractNpmPlugin(tgzFile, pluginId) {
        return __awaiter(this, void 0, void 0, function* () {
            debug(`Extracting ${tgzFile} ...`);
            const targz = new Targz({}, {
                strip: 1 // strip the first "package" directory
            });
            yield targz.extract(tgzFile, path.join(this.options.pluginsDirectory, pluginId));
        });
    }
    downloadNpmPlugin(npmUrl) {
        return __awaiter(this, void 0, void 0, function* () {
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
exports.PluginManager = PluginManager;
class PluginInfo {
}
exports.PluginInfo = PluginInfo;
class NpmReference {
    static parse(fullUrl) {
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
}
exports.NpmReference = NpmReference;
//# sourceMappingURL=PluginManager.js.map