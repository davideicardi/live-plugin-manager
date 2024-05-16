export { createWriteStream } from "fs-extra";
export declare function remove(fsPath: string): Promise<void>;
export declare function directoryExists(fsPath: string): Promise<boolean>;
export declare function fileExists(fsPath: string): Promise<boolean>;
export declare function ensureDir(fsPath: string): Promise<void>;
export declare function readFile(fsPath: string, encoding: string): Promise<string>;
export declare function readJsonFile(fsPath: string): Promise<any>;
export declare function writeFile(fsPath: string, content: string, encoding?: string): Promise<void>;
export declare function copy(src: string, dest: string, options?: Partial<CopyOptions>): Promise<void>;
export interface CopyOptions {
    exclude: string[];
}
export declare function pathExists(fsPath: string): Promise<boolean>;
export declare function access(fsPath: string, mode?: number): Promise<void>;
export declare function readdir(fsPath: string): Promise<string[]>;
export declare function rename(oldPath: string, newPath: string): Promise<void>;
export declare function symlink(target: string, path: string): Promise<void>;
