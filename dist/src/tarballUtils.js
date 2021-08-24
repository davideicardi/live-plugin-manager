"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadTarball = exports.extractTarball = void 0;
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const fs = __importStar(require("./fileSystem"));
const tar = __importStar(require("tar"));
const debug_1 = __importDefault(require("debug"));
const httpUtils = __importStar(require("./httpUtils"));
const debug = debug_1.default("live-plugin-manager.TarballUtils");
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