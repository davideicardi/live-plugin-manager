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
const fs = require("fs-extra");
const path = require("path");
var fs_extra_1 = require("fs-extra");
exports.createWriteStream = fs_extra_1.createWriteStream;
function remove(fsPath) {
    return fs.remove(fsPath);
}
exports.remove = remove;
function directoryExists(fsPath) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const stats = yield fs.stat(fsPath);
            return stats.isDirectory();
        }
        catch (err) {
            if (err.code === "ENOENT") {
                return false;
            }
            throw err;
        }
    });
}
exports.directoryExists = directoryExists;
function fileExists(fsPath) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const stats = yield fs.stat(fsPath);
            return stats.isFile();
        }
        catch (err) {
            if (err.code === "ENOENT") {
                return false;
            }
            throw err;
        }
    });
}
exports.fileExists = fileExists;
function ensureDir(fsPath) {
    return fs.ensureDir(fsPath);
}
exports.ensureDir = ensureDir;
function readFile(fsPath, encoding) {
    return fs.readFile(fsPath, encoding);
}
exports.readFile = readFile;
function readJsonFile(fsPath) {
    return fs.readJson(fsPath);
}
exports.readJsonFile = readJsonFile;
function writeFile(fsPath, content, encoding) {
    return fs.writeFile(fsPath, content, { encoding });
}
exports.writeFile = writeFile;
function copy(src, dest, options) {
    const excludeList = options && options.exclude
        ? options.exclude.map((f) => path.join(src, f).toLowerCase())
        : [];
    const filter = (filterSrc, filterDest) => {
        filterSrc = filterSrc.toLowerCase();
        if (excludeList.indexOf(filterSrc) >= 0) {
            return false;
        }
        return true;
    };
    return fs.copy(src, dest, { filter });
}
exports.copy = copy;
//# sourceMappingURL=fileSystem.js.map