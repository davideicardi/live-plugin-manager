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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BitbucketRegistryClient = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("./fileSystem"));
const httpUtils_1 = require("./httpUtils");
const debug_1 = __importDefault(require("debug"));
const tarballUtils_1 = require("./tarballUtils");
const debug = (0, debug_1.default)("live-plugin-manager.BitbucketRegistryClient");
class BitbucketRegistryClient {
    constructor(auth) {
        if (auth) {
            debug(`Authenticating Bitbucket api with ${auth.type}...`);
            switch (auth.type) {
                case "basic":
                    this.headers = Object.assign(Object.assign({}, (0, httpUtils_1.headersBasicAuth)(auth.username, auth.password)), { "user-agent": "live-plugin-manager" });
                    break;
                default:
                    throw new Error("Auth type not supported");
            }
        }
        else {
            this.headers = {};
        }
    }
    get(repository) {
        return __awaiter(this, void 0, void 0, function* () {
            const repoInfo = extractRepositoryInfo(repository);
            debug("Repository info: ", repoInfo);
            const urlPkg = `https://api.bitbucket.org/2.0/repositories/${repoInfo.owner}/${repoInfo.repo}/src/${repoInfo.ref}/package.json`;
            const pkgContent = yield (0, httpUtils_1.httpJsonGet)(urlPkg, Object.assign(Object.assign({}, this.headers), { accept: "application/json" }));
            if (!pkgContent || !pkgContent.name || !pkgContent.version) {
                throw new Error("Invalid plugin Bitbucket repository " + repository);
            }
            const urlArchiveLink = `https://bitbucket.org/${repoInfo.owner}/${repoInfo.repo}/get/${repoInfo.ref}.tar.gz`;
            pkgContent.dist = { tarball: urlArchiveLink };
            return pkgContent;
        });
    }
    download(destinationDirectory, packageInfo) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!packageInfo.dist || !packageInfo.dist.tarball) {
                throw new Error("Invalid dist.tarball property");
            }
            const tgzFile = yield (0, tarballUtils_1.downloadTarball)(packageInfo.dist.tarball, this.headers);
            const pluginDirectory = path.join(destinationDirectory, packageInfo.name);
            try {
                yield (0, tarballUtils_1.extractTarball)(tgzFile, pluginDirectory);
            }
            finally {
                yield fs.remove(tgzFile);
            }
            return pluginDirectory;
        });
    }
    isBitbucketRepo(version) {
        return version.indexOf("/") > 0;
    }
}
exports.BitbucketRegistryClient = BitbucketRegistryClient;
function extractRepositoryInfo(repository) {
    const parts = repository.split("/");
    if (parts.length !== 2) {
        throw new Error("Invalid repository name");
    }
    const repoParts = parts[1].split("#");
    const repoInfo = {
        owner: parts[0],
        repo: repoParts[0],
        ref: repoParts[1] || "master"
    };
    return repoInfo;
}
//# sourceMappingURL=BitbucketRegistryClient.js.map