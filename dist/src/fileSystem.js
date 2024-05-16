"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.symlink = exports.rename = exports.readdir = exports.access = exports.pathExists = exports.copy = exports.writeFile = exports.readJsonFile = exports.readFile = exports.ensureDir = exports.fileExists = exports.directoryExists = exports.remove = exports.createWriteStream = void 0;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
var fs_extra_1 = require("fs-extra");
Object.defineProperty(exports, "createWriteStream", { enumerable: true, get: function () { return fs_extra_1.createWriteStream; } });
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
    const filter = (filterSrc, _filterDest) => {
        filterSrc = filterSrc.toLowerCase();
        if (excludeList.indexOf(filterSrc) >= 0) {
            return false;
        }
        return true;
    };
    return fs.copy(src, dest, { filter, dereference: true });
}
exports.copy = copy;
function pathExists(fsPath) {
    return fs.pathExists(fsPath);
}
exports.pathExists = pathExists;
function access(fsPath, mode) {
    return fs.access(fsPath, mode);
}
exports.access = access;
function readdir(fsPath) {
    return fs.readdir(fsPath);
}
exports.readdir = readdir;
function rename(oldPath, newPath) {
    return fs.rename(oldPath, newPath);
}
exports.rename = rename;
function symlink(target, path) {
    return fs.symlink(target, path);
}
exports.symlink = symlink;
//# sourceMappingURL=fileSystem.js.map