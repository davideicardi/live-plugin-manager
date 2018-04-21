# live-plugin-manager

[![npm version](https://badge.fury.io/js/live-plugin-manager.svg)](https://www.npmjs.com/package/live-plugin-manager)
[![Build Status](https://travis-ci.org/davideicardi/live-plugin-manager.svg?branch=master)](https://travis-ci.org/davideicardi/live-plugin-manager)

`live-plugin-manager` is a Node.js module that allows you to 
install, uninstall and load any node package at runtime from npm registry.

My main goal is to allow any application to be easily extensible by 
installing and running any node package at runtime, without deployments or server customization. You can basically allow your users to decide what plugin/extension to install.

Main features are:

- Install and run Node packages at runtime (no deployment)
- Install from npm registry (private or public)
- Install from filesystem
- Install from github (branch, commit or tag)
- Update/uninstall packages
- Any Node.js packages can be installed
  - No special configuration is required
- Installd packages can have dependencies 
  - dependencies are automatically installed
  - when updating a dependencies all dependents are reloaded
- Support for concurrency operation on filesystem (cloud/webfarm scenario where file system is shared)
  - A filesystem lock is used to prevent multiple instances to work on the same filesystem in the same moment
- Each package run in an semi isolated environment (VM sandbox)
- Set different environment variables for each package
- Implementated in Typescript
- Fully tested (mocha tests)

There are some **known limitations**, see section at the end.

## Installation

    npm install live-plugin-manager

## Usage

    import {PluginManager} from "live-plugin-manager";

    const manager = new PluginManager();

    async function run() {
      await manager.install("moment");

      const moment = manager.require("moment");
      console.log(moment().format());

      await manager.uninstall("moment");
    }

    run();

In the above code I install `moment` package at runtime, load and execute it.

Plugins are installed inside the directory specified in the `PluginManager` constructor or in the `plugin_packages` directory if not specified.

Each time your applicaition start you should reinstall any packages that you need; already downloaded packages are not automatically installed, but installation is faster because no new file is downloaded. Typically I suggest to put the list of the installed packages in a database or any other central repository.

Here another more complex scenario where I install `express` with all it's dependencies, just to demostrate how many possibilities you can have:

    import {PluginManager} from "live-plugin-manager";

    const manager = new PluginManager();

    async function run() {
      await manager.install("express");
      const express = manager.require("express");

      const app = express();
      app.get("/", function(req: any, res: any) {
        res.send("Hello World!");
      });

      const server = app.listen(3000, function() {
      });
    }

    run();


## Load plugins

`live-plugin-manager` doesn't have any special code or convention to load plugins.
When you require a plugin it just load the main file (taken from `package.json`) and execute it, exactly like standard node.js `require`.
Often when working with plugins you need some extension point or convention to actually integrate your plugins inside your host application. Here are some possible solutions:

- [c9/architect](https://github.com/c9/architect)
- [easeway/js-plugins](https://github.com/easeway/js-plugins)

Another solution is to load your plugins inside a Dependency Injection container. 

I'm working also on [shelf-depenency](https://www.npmjs.com/package/shelf-dependency), a simple dependency injection/inversion of control container that can be used to load plugins.

## Samples

- See `./samples` and `./test` directories
- Sample of an extensible web application: [lpm-admin](https://github.com/davideicardi/lpm-admin)

## Reference

### PluginManager.constructor(options?: Partial\<PluginManagerOptions\>)

Create a new instance of `PluginManager`. Takes an optional `options` parameter with the following properties:

- `cwd`: current working directory (default to `process.cwd()`)
- `pluginsPath`: plugins installation directory (default to `.\plugin_packages`, see `cwd`). Directory is created if not exists
- `npmRegistryUrl`: npm registry to use (default to https://registry.npmjs.org)
- `npmRegistryConfig`: npm registry configuration see [npm-registry-client config](https://github.com/npm/npm-registry-client)
- `ignoredDependencies`: array of string or RegExp with the list of dependencies to ignore, default to `@types/*`
- `staticDependencies`: object with an optional list of static dependencies that can be used to force a dependencies to be ignored (not installed when a plugin depend on it) and loaded from this list
- `githubAuthentication`: Github authentication configuration (optional). See `installFromGithub` or [Github api authentication](https://github.com/octokit/node-github#authentication) for more info.
- `lockWait`: A number of milliseconds to wait for locks when installing modules to expire before giving up. (default 2 min)
- `lockStale`: A number of milliseconds before installations locks are considered to have expired. (default 3 min)

### pluginManager.install(name: string, version?: string): Promise\<IPluginInfo\>

Install the specified package from npm registry or directly from github repository. 
`version` parameter can be a version like `1.0.3` or a github repository in the format `owner/repository_name#ref` (like `expressjs/express#351396f`).
If a version is specified package is downloaded from NPM.

Dependencies are automatically installed (devDependencies are ignored).

### pluginManager.installFromNpm(name: string, version = "latest"): Promise\<IPluginInfo\>

Install the specified package from npm registry. Dependencies are automatically installed (devDependencies are ignored).
By default is the package is already available in the download folder then and version is compatible then it is not requested again from npm. Change this behaviour by setting `npmInstallMode: "noCache"` options.

To setup authentication for private npm registry use:

    const manager = new PluginManager({
      npmRegistryUrl: "http://your-private-registry",
      npmRegistryConfig: {
        auth: {
          token: "your-token"
        }
      }
    });


### pluginManager.installFromGithub(repository: string): Promise\<IPluginInfo\>

Install the specified package from github. `repository` is specified in the format `owner/repository_name#ref` (like `expressjs/express#351396f`).
Dependencies are automatically installed (devDependencies are ignored).

Note: Github has an API rate limit of 60 calls if not authenticated. To authenticate calls just set the `githubAuthentication` property in the options:

    manager = new PluginManager({
      githubAuthentication: {
        "type": "basic",
        "username": "YOUR_USER",
        "password": "YOUR_PERSONAL_TOKEN"
      }
    });

See [Github api authentication](https://github.com/octokit/node-github#authentication) for more info.

### installFromPath(location: string, options: {force: boolean} = {}): Promise\<IPluginInfo\>

Install the specified package from a filesystem location. Dependencies are automatically installed from npm. `node_modules` folder is excluded from source location.

### installFromCode(name: string, code: string, version?: string): Promise\<IPluginInfo\>

Install a package by specifiing code directly. If no version is specified it will be always reinstalled.

### uninstall(name: string): Promise\<void\>

Uninstall the package. Dependencies are not uninstalled automatically.

### uninstallAll(): Promise\<void\>

Uninstall all installed packages.

### list(): Promise\<IPluginInfo[]\>

Get the list of installed packages.

### require(name: string): any

Load and get the instance of the plugin. Node.js `require` rules are used to load modules.
Calling require multiple times gives always the same instance until plugins changes.

### getInfo(name: string): IPluginInfo | undefined

Get information about an installed package.

### runScript(code: string): any

Run the specified Node.js javascript code with the same context of plugins. Script are executed using `vm` as with each plugin.

### async queryPackage(name: string, version?: string): Promise<PackageInfo>

Get package/module info from npm registry or github depending of the version format.

### async queryPackageFromNpm(name: string, version = "latest"): Promise<PackageInfo>

Get package/module info from npm registry.

### async queryPackageFromGithub(repository: string): Promise<PackageInfo>

Get package/module info from github registry.

## Security

Often is a bad idea for security to allow installation and execution of any node.js package inside your application.
When installing a package it's code is executed with the same permissions of your host application and can potentially damage your entire server.
I suggest usually to allow to install only a limited sets of plugins or only allow trusted administrator to install plugins.

## Sandbox

For advanced scenarios you can customize the sandbox where each plugin run. Sandbox defined NodeJS `global` object.
A typical scenario is to customize the environment variables `global.process.env`. To customize the sandbox you can set a single
sandbox for all plugins using `options.sandbox` in the `PluginManager` constructor or set a different sandbox for each plugin, see
`PluginManager.setSandboxTemplate` and `PluginManager.getSandboxTemplate` functions.

## Under to hood

This project use the following dependencies to do it's job:

- [vm](https://nodejs.org/api/vm.html): compiling and running plugin code within V8 Virtual Machine contexts
- [lockfile](https://github.com/npm/lockfile): file system locking to prevent concurrent operations (see below)
- [tar.gz](https://github.com/alanhoff/node-tar.gz): extract package file
- [fs-extra](https://github.com/jprichardson/node-fs-extra): file system operations
- [debug](https://github.com/visionmedia/debug): debug informations
- (removed for now because I have problems with getArchiveLink api, 302 ...) [github](https://www.npmjs.com/package/github)
- (removed for now because for some dependencies issues) [npm-registry-client](https://github.com/npm/npm-registry-client): npm registry handling

While I have tried to mimic the standard Node.js module and package architecture there are some differences.
First of all is the fact that plugins by definition are installed at runtime in contrast with a standard Node.js application where modules are installed before executin the node.js proccess.
Modules can be loaded one or more times, instead in standard Node.js they are loaded only the first time that you `require` it.
Only one version of a plugin can be installed, also for dependencies, while in Node.js multiple version can be installed (each module can have it's own `node_modules`).

### Locking

A file system locking is implemented using [lockfile](https://github.com/npm/lockfile) library to allow multiple app instances to share the file system. 
This is common in some cloud scenario (for example Azure) where file system is shared between instances.

Locking is used to ensure that only one instance is installing/uninstalling plugins in a given moment.

You can configure `lockWait` inside constructor to configure lock timeout, and `lockStale` to consider a file lock no more valid after that period.

## Git integration

Remember to git ignore the directory where packages are installed, see `pluginsPath`.
Usually you should add this to your `.gitignore` file:

    plugin_packages

## Known limitations

There are some known limitations when installing a package:

- Different plugins cannot depends on different/incompatible modules. If plugin A require module x at version 1 and plugin B require the same module X at version 2 then plugin A and plugin B cannot be installed simultaneously. Version 2 of module X will be used and this can cause problems on your code.
- No `pre/post-install` scripts are executed (some packages use this scripts to build assets or for platform specific installation, so for this reason some packages are not supported)
- C/C++ packages (`.node`) are not supported
- Plugin dependencies can be specified only as NPM dependencies (version number) or github dependencies (owner/repo), url or other kind of dependencies are not supported

If you find other problems please open an issue.

## License (MIT)

MIT License

Copyright (c) 2018 Davide Icardi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
