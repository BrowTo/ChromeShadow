<h1 align="center"> ChromeShadow </h1> <br>
<p align="center">
    <img alt="ChromeShadow" title="ChromeShadow" src="https://imgur.com/IFjvmjJ.png" width="128">
</p>

<h4 align="center">
  Cross-platform Chrome multi-open Manager
</h4>

[![en](https://img.shields.io/badge/lang-en-red.svg)](https://github.com/BrowTo/ChromeShadow/blob/main/README.md)
[![zh](https://img.shields.io/badge/语言-中文-yellow.svg)](https://github.com/BrowTo/ChromeShadow/blob/main/README.zh.md)

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Download](#download)
- [Related](#related)
- [Feedback](#feedback)
- [Run Process](#run-process)
- [Credits](#credits)
- [License](#license)

## Introduction

ChromeShadow is a cross-platform Chrome multi-open desktop App tool built on top of [Tauri 2.0](https://v2.tauri.app/). The underlying logic is to run multiple Chrome instances through the command line, and configure different Chrome instances through the UI interface and manage them uniformly.

[![forthebadge](http://forthebadge.com/images/badges/made-with-rust.svg)](http://forthebadge.com)
[![forthebadge](http://forthebadge.com/images/badges/built-with-love.svg)](http://forthebadge.com)

**Available for both MacOS and Windows.**

<p align="center">
  <img src = "https://imgur.com/ieXnw3f.png" width=680>
</p>

## Features

A few of the things you can do with ChromeShadow:

* Basic: Create a new Chrome browser or batch create multiple browsers.
* Grouping: Allows you to manage multiple Chrome browsers in groups.
* Proxy: Create HTTP or SOCKS5 proxies and apply them to different Chrome browsers, and support proxies that require user names and passwords for authentication.
* Note: Brief remarks about browsers, groups, and proxies are supported.
* Multi-language: Currently support Chinese and English free switching.
* API: You can automate the management of your Chrome browser (RPA) with the automatically enabled native API server feature.

## Download

You can [download](https://github.com/BrowTo/ChromeShadow/releases) the latest installable version of ChromeShadow for Windows and macOS.

## Related

If you're not satisfied with a simple Chrome multi-open manager, use my other seamlessly integrated tool, the [BrowTo Desktop App](https://browto.com). Once you connect to ChromeShadow with BrowTo, you can record your actions on the page and replay them in bulk across countless Chrome browsers (Including extensions such as MetaMask). You can read the usage [documentation](https://docs.browto.com/) to learn more.

## Feedback

Feel free to send us feedback on [Twitter](https://twitter.com/0xDHClub) or [file an issue](https://github.com/BrowTo/ChromeShadow/issues/new). Feature requests are always welcome.

If there's anything you'd like to chat about, please feel free to join our [Telegram chat](https://t.me/+DMqNZV1aR_85NTMx)!

## Run Process

- Follow the [Tauri Guide](https://v2.tauri.app/start/prerequisites/) for getting started building a project with native code. 
- Clone or download the repo
- `pnpm i` to install dependencies
- `pnpm tauri dev` to run the project

## Credits

This software uses the following open source packages:

- [Tauri](https://v2.tauri.app/)
- [Node.js](https://nodejs.org/)
- [Shadcn](https://ui.shadcn.com/)
- [TailwindCSS](https://tailwindcss.com/)
- [I18Next](https://www.i18next.com/)
- [React.js](https://react.dev/)

## License

This project is licensed under the terms of the **MIT** license.

---