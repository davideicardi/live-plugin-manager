"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs-extra");
const path = require("path");
var fs_extra_1 = require("fs-extra");
exports.createWriteStream = fs_extra_1.createWriteStream;
function remove(fsPath) {
    return new Promise((resolve, reject) => {
        fs.remove(fsPath, (err) => {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
}
exports.remove = remove;
function exists(fsPath) {
    return new Promise((resolve, reject) => {
        fs.exists(fsPath, (pathExists) => {
            resolve(pathExists);
        });
    });
}
exports.exists = exists;
function ensureDir(fsPath) {
    return new Promise((resolve, reject) => {
        fs.ensureDir(fsPath, (err) => {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
}
exports.ensureDir = ensureDir;
function readFile(fsPath, encoding) {
    return new Promise((resolve, reject) => {
        fs.readFile(fsPath, encoding, (err, data) => {
            if (err) {
                return reject(err);
            }
            resolve(data);
        });
    });
}
exports.readFile = readFile;
function writeFile(fsPath, content, encoding) {
    return new Promise((resolve, reject) => {
        fs.writeFile(fsPath, content, { encoding }, (err) => {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
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
    return new Promise((resolve, reject) => {
        fs.copy(src, dest, { filter }, (err) => {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
}
exports.copy = copy;
//# sourceMappingURL=fileSystem.js.map