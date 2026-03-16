// Learn more: https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

/** @type {import('expo/metro-config').MetroConfig} */
module.exports = withNativeWind(config, { input: "./src/styles.css" });
