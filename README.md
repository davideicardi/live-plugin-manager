# live-plugin-manager

`live-plugin-manager` is a Node.js module that allows you to 
install, uninstall and load any node package at runtime from npm registry.

My main goal is to allow a Node.js application to be extensible at runtime by installing plugins. For example you can recreate a Wordpress like experience and allow your users to extend your application with custom modules.

Main features are:

- Install plugins from npm registry (private or public)
- Install plugins from filesystem
- Most Node.js packages can be installed
  - No special configuration are required extension points
  - See Known limitations
- Plugins can have dependencies that are automatically installed
- Support for concurrency operation on filesystem (cloud/webfarm scenario where file system is shared)
  - A filesystem lock is used to prevent multiple instances to work on the same filesystem in the same moment
- Implementated in Typescript

## Installation

    npm install live-plugin-manager --save

## Usage

    import {PluginManager} from "live-plugin-manager";
    import * as path from "path";

    const manager = new PluginManager({
      pluginsPath: path.join(__dirname, "plugins")
    });

    async function run() {
      await manager.installFromNpm("moment");

      const moment = manager.require("moment");
      console.log(moment().format());

      await manager.uninstall("moment");
    }

    run();

In the above code I install `moment` package at runtime, load and execute it.

Plugins are installed inside the directory specified in the `PluginManager` constructor or in the `plugins` directory if not specified.

Each time your applicaition start you should reinstall any packages that you need, already downloaded packages are not automatically installed, but installation is faster because no new file is downloaded. Typically I suggest to put the list of the installed packages in a database or any other central repository.

## Load plugins

`live-plugin-manager` doesn't have any special code to load plugins.
When you require a plugin it just load the main file (taken from `package.json`) and execute it, exactly like standard node.js `require`.
Often when working with plugins you need some extension point or convention to actually integrate your plugins inside your host application. Here are some possible solutions:

- [c9/architect](https://github.com/c9/architect)
- [easeway/js-plugins](https://github.com/easeway/js-plugins)

Another solution is to load your plugins inside a Dependency Injection container. 

I'm working also on [shelf-depenency](https://www.npmjs.com/package/shelf-dependency), a simple dependency injection/inversion of control container that can use loaded plugins.

## Samples

- See `./samples` and `./test` directories
- Real world scenario: TODO 

## Reference

### PluginManager.constructor(options?: Partial\<PluginManagerOptions\>)

Create a new instance of `PluginManager`. Takes an optional `options` parameter with the following properties:

- `pluginsPath`: plugins installation directory (default to .\plugins)
- `npmRegistryUrl`: npm registry to use (default to https://registry.npmjs.org)
- `npmRegistryConfig`: npm registry configuration see [npm-registry-client config](https://github.com/npm/npm-registry-client)

### pluginManager.installFromNpm(name: string, version = "latest"): Promise\<PluginInfo\>)

Install the specified package from npm registry. Dependencies are automatically installed (not devDependencies).

### installFromPath(location: string): Promise\<PluginInfo\>

Install the specified package from a filesystem location. Dependencies are automatically installed from npm.

### uninstall(name: string): Promise\<void\>

Uninstall the package. Dependencies are not uninstalled automatically.

### uninstallAll(): Promise\<void\>

Uninstall all installed packages.

### list(): Promise\<PluginInfo[]\>

Get the list of installed packages.

### require(name: string): any

Get the instance of the plugin. Node.js `require` rules are used to load modules.

### getInfo(name: string): PluginInfo | undefined

Get information about an installed package.

## Security

Often is a bad idea for security to allow installation and execution of any node.js package inside your application.
When installing a package it's code is executed with the same permissions of your host application and can potentially damage your entire server.
I suggest usually to allow to install only a limited sets of plugins or only allow administrator to install plugins.

## Under to hood

This project use the following dependencies to do it's job:

- npm-registry-client: npm registry handling
- lockfile: file system locking to prevent concurrent operations
- tar.gz: extract package file
- fs-extra: file system operations
- debug: debug informations

## Known limitations

Some limitations when installing a package:

- No `pre/post-install` scripts are executed (for now)
- C/C++ packages (`.node`) are not supported

If you found other problems please open an issue.

## License (MIT)

MIT License

Copyright (c) 2017 Davide Icardi

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
