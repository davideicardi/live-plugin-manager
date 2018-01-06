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
const node_fetch_1 = require("node-fetch");
const fs = require("./fileSystem");
const Debug = require("debug");
const debug = Debug("live-plugin-manager.HttpUtils");
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
        Authorization: "Basic " + new Buffer(username + ":" + password).toString("base64")
    };
}
exports.headersBasicAuth = headersBasicAuth;
function httpJsonGet(sourceUrl, headers) {
    return __awaiter(this, void 0, void 0, function* () {
        if (debug.enabled) {
            debug(`Json GET ${sourceUrl} ...`);
            debug("HEADERS", headers);
        }
        const res = yield node_fetch_1.default(sourceUrl, { headers: Object.assign({}, headers) });
        if (debug.enabled) {
            debug("Response HEADERS", res.headers);
        }
        if (!res.ok) {
            throw new Error(`Response error ${res.status} ${res.statusText}`);
        }
        return res.json();
    });
}
exports.httpJsonGet = httpJsonGet;
function httpDownload(sourceUrl, destinationFile, headers) {
    return __awaiter(this, void 0, void 0, function* () {
        if (debug.enabled) {
            debug(`Download GET ${sourceUrl} ...`);
            debug("HEADERS", headers);
        }
        const res = yield node_fetch_1.default(sourceUrl, { headers: Object.assign({}, headers) });
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
                if (fs.fileExists(destinationFile)) {
                    fs.remove(destinationFile);
                }
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