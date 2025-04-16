<h1 align="center"> 谷影 </h1> <br>
<p align="center">
    <img alt="ChromeShadow" title="ChromeShadow" src="https://imgur.com/IFjvmjJ.png" width="128">
</p>

<h4 align="center">
  谷歌跨平台多开管理器
</h4>

[![en](https://img.shields.io/badge/lang-en-red.svg)](https://github.com/BrowTo/ChromeShadow/blob/main/README.md)
[![zh](https://img.shields.io/badge/语言-中文-yellow.svg)](https://github.com/BrowTo/ChromeShadow/blob/main/README.zh.md)

## 目录

- [介绍](#introduction)
- [功能](#features)
- [下载](#download)
- [相关工具](#related)
- [反馈](#feedback)
- [构建运行](#run-process)
- [感谢项目](#credits)
- [许可证](#license)

## 介绍

谷影 App 是一个跨平台的 Chrome 多开应用管理程序工具，建立在[Tauri 2.0](https://v2.tauri.app/)之上。其底层逻辑是通过命令行运行多个 Chrome 实例，然后通过 UI 界面配置不同的 Chrome 实例并统一进行管理。

[![forthebadge](http://forthebadge.com/images/badges/made-with-rust.svg)](http://forthebadge.com)
[![forthebadge](http://forthebadge.com/images/badges/built-with-love.svg)](http://forthebadge.com)

**同时支持 MacOS 和 Windows 操作系统**

<p align="center">
  <img src = "https://imgur.com/doLQIkX.png" width=680>
</p>

## 功能

你可以用谷影 App 实现以下功能：

- 基本功能：创建一个新的 Chrome 浏览器或批量创建多个浏览器。
- 分组功能：允许对多个 Chrome 浏览器进行分组管理。
- 代理功能：创建 HTTP 或 SOCKS5 代理，并将其应用于不同的 Chrome 浏览器，并支持需要用户名和密码进行认证的代理。
- 备注功能：对浏览器，分组和代理进行备注。
- 多语言支持：目前支持中英文自由切换。
- API 功能：使用自动启用的本地 API 服务器功能将你创建的 Chrome 浏览器进行自动化操作。

## 下载

你可以前往[下载](https://github.com/BrowTo/ChromeShadow/releases)去找到对应您操作系统的最新版本 App 进行下载。

## 相关工具

如果你不满足于一个简单的 Chrome 多开管理器，那推荐你使用我的另一个无缝集成工具：[指纹猎手](https://browto.com)。一旦你用指纹猎手连接到谷影，你就可以在任何网页上记录你的操作（包括MetaMask等插件），然后在无数的Chrome浏览器上批量重放它们。您可以阅读用法[文档](https://docs.browto.com/)以了解更多信息。

## 反馈

请随时通过[Twitter](https://twitter.com/0xDHClub)或[提交问题](https://github.com/BrowTo/ChromeShadow/issues/new)向我们发送反馈，当然如果你有新的需求和想法也可以反馈给我们。

如果你有什么想详细聊的，请随时加入我们的[Telegram chat](https://t.me/+DMqNZV1aR_85NTMx)！

## 构建运行

- 请先遵循 [Tauri 文档](https://v2.tauri.app/start/prerequisites/) 来完成必要的前置工作
- 克隆或下载项目
- `pnpm i` 来安装相关依赖
- `pnpm tauri dev` 开始本地运行项目

## 感谢项目

本软件使用并感谢以下开源软件的辛苦付出：

- [Tauri](https://v2.tauri.app/)
- [Node.js](https://nodejs.org/)
- [Shadcn](https://ui.shadcn.com/)
- [TailwindCSS](https://tailwindcss.com/)
- [I18Next](https://www.i18next.com/)
- [React.js](https://react.dev/)

## 许可证

本项目在**MIT**许可条款下获得许可。

---
