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
const os = require("os");
const path = require("path");
const fs = require("./fileSystem");
const tar = require("tar");
const Debug = require("debug");
const httpUtils = require("./httpUtils");
const debug = Debug("live-plugin-manager.TarballUtils");
function extractTarball(tgzFile, destinationDirectory) {
    return __awaiter(this, void 0, void 0, function* () {
        debug(`Extracting ${tgzFile} to ${destinationDirectory} ...`);
        yield fs.ensureDir(destinationDirectory);
        yield tar.extract({
            file: tgzFile,
            cwd: destinationDirectory,
            strip: 1
        });
    });
}
exports.extractTarball = extractTarball;
function downloadTarball(url, headers) {
    return __awaiter(this, void 0, void 0, function* () {
        const destinationFile = path.join(os.tmpdir(), Date.now().toString() + ".tgz");
        // delete file if exists
        if (yield fs.fileExists(destinationFile)) {
            yield fs.remove(destinationFile);
        }
        debug(`Downloading ${url} to ${destinationFile} ...`);
        yield httpUtils.httpDownload(url, destinationFile, headers);
        return destinationFile;
    });
}
exports.downloadTarball = downloadTarball;
//# sourceMappingURL=tarballUtils.js.map