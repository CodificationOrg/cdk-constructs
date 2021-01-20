"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const path = require("path");
const buildConfig = require('@codification/cutwater-build-web').getConfig();
const isProduction = buildConfig.production;
const webpackConfiguration = {
    mode: isProduction ? 'production' : 'development',
    entry: {
        'sns-email-forms': path.join(__dirname, buildConfig.libES6Folder, 'lambda/handler', 'EmailFormHandler.js')
    },
    output: {
        libraryTarget: 'umd',
        path: path.join(__dirname, buildConfig.distFolder),
        filename: `[name].js`,
    },
    devtool: 'source-map',
    externals: ['aws-sdk'],
    target: 'node'
};
module.exports = webpackConfiguration;