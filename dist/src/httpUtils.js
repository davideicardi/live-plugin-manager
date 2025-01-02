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
exports.httpDownload = exports.httpJsonGet = exports.headersBasicAuth = exports.headersTokenAuth = exports.headersBearerAuth = void 0;
const node_fetch_commonjs_1 = __importDefault(require("node-fetch-commonjs"));
const fs = __importStar(require("./fileSystem"));
const debug_1 = __importDefault(require("debug"));
const proxy_agent_1 = require("proxy-agent");
const debug = (0, debug_1.default)("live-plugin-manager.HttpUtils");
const agent = new proxy_agent_1.ProxyAgent();
function headersBearerAuth(token) {
    return {
        Authorization: "Bearer " + token
    };
}
exports.headersBearerAuth = headersBearerAuth;
function headersTokenAuth(token) {
    return {
        Authorization: "token " + token
    };
}
exports.headersTokenAuth = headersTokenAuth;
function headersBasicAuth(username, password) {
    return {
        Authorization: "Basic " + Buffer.from(username + ":" + password).toString("base64")
    };
}
exports.headersBasicAuth = headersBasicAuth;
function httpJsonGet(sourceUrl, headers) {
    return __awaiter(this, void 0, void 0, function* () {
        if (debug.enabled) {
            debug(`Json GET ${sourceUrl} ...`);
            debug("HEADERS", headers);
        }
        const res = yield (0, node_fetch_commonjs_1.default)(sourceUrl, { agent, headers: Object.assign({}, headers) });
        if (debug.enabled) {
            debug("Response HEADERS", res.headers);
        }
        if (!res.ok) {
            throw new Error(`Response error ${res.status} ${res.statusText}`);
        }
        return yield res.json();
    });
}
exports.httpJsonGet = httpJsonGet;
function httpDownload(sourceUrl, destinationFile, headers) {
    return __awaiter(this, void 0, void 0, function* () {
        if (debug.enabled) {
            debug(`Download GET ${sourceUrl} ...`);
            debug("HEADERS", headers);
        }
        const res = yield (0, node_fetch_commonjs_1.default)(sourceUrl, { agent, headers: Object.assign({}, headers) });
        if (debug.enabled) {
            debug("Response HEADERS", res.headers);
        }
        if (!res.ok) {
            throw new Error(`Response error ${res.status} ${res.statusText}`);
        }
        return new Promise((resolve, reject) => {
            const fileStream = fs.createWriteStream(destinationFile);
            res.body.pipe(fileStream);
            res.body.on("error", (err) => {
                fileStream.close();
                fs.fileExists(destinationFile)
                    .then(fExist => {
                    if (fExist) {
                        return fs.remove(destinationFile);
                    }
                })
                    .catch((err) => debug(err));
                ;
                reject(err);
            });
            fileStream.on("finish", function () {
                fileStream.close();
                resolve();
            });
        });
    });
}
exports.httpDownload = httpDownload;
//# sourceMappingURL=httpUtils.js.map