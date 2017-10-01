"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs-extra");
var fs_extra_1 = require("fs-extra");
exports.createWriteStream = fs_extra_1.createWriteStream;
function remove(path) {
    return new Promise((resolve, reject) => {
        fs.remove(path, (err) => {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
}
exports.remove = remove;
function exists(path) {
    return new Promise((resolve, reject) => {
        fs.exists(path, (pathExists) => {
            resolve(pathExists);
        });
    });
}
exports.exists = exists;
function ensureDir(path) {
    return new Promise((resolve, reject) => {
        fs.ensureDir(path, (err) => {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
}
exports.ensureDir = ensureDir;
function readFile(path, encoding) {
    return new Promise((resolve, reject) => {
        fs.readFile(path, encoding, (err, data) => {
            if (err) {
                return reject(err);
            }
            resolve(data);
        });
    });
}
exports.readFile = readFile;
function writeFile(path, content, encoding) {
    return new Promise((resolve, reject) => {
        fs.writeFile(path, content, { encoding }, (err) => {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
}
exports.writeFile = writeFile;
function copy(src, dest) {
    return new Promise((resolve, reject) => {
        fs.copy(src, dest, (err) => {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
}
exports.copy = copy;
//# sourceMappingURL=fileSystem.js.map