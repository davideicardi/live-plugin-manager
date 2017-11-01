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
const Debug = require("debug");
const httpUtils_1 = require("./httpUtils");
const debug = Debug("live-plugin-manager.TarballUtils");
const Targz = require("tar.gz");
function extractTarball(tgzFile, destinationDirectory) {
    return __awaiter(this, void 0, void 0, function* () {
        debug(`Extracting ${tgzFile} to ${destinationDirectory} ...`);
        const targz = new Targz({}, {
            strip: 1 // strip the first "package" directory
        });
        yield targz.extract(tgzFile, destinationDirectory);
    });
}
exports.extractTarball = extractTarball;
function downloadTarball(url) {
    return __awaiter(this, void 0, void 0, function* () {
        const destinationFile = path.join(os.tmpdir(), Date.now().toString() + ".tgz");
        // delete file if exists
        if (yield fs.exists(destinationFile)) {
            yield fs.remove(destinationFile);
        }
        debug(`Downloading ${url} to ${destinationFile} ...`);
        yield httpUtils_1.httpDownload(url, destinationFile);
        return destinationFile;
    });
}
exports.downloadTarball = downloadTarball;
//# sourceMappingURL=tarballUtils.js.map