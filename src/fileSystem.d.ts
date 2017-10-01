export { createWriteStream } from "fs-extra";
export declare function remove(path: string): Promise<void>;
export declare function exists(path: string): Promise<boolean>;
export declare function ensureDir(path: string): Promise<void>;
export declare function readFile(path: string, encoding: string): Promise<string>;
export declare function writeFile(path: string, content: string, encoding?: string): Promise<void>;
export declare function copy(src: string, dest: string): Promise<void>;
