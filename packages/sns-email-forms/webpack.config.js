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
        'index': path.join(__dirname, buildConfig.srcFolder, 'index.ts'),
        'sns-email-forms': path.join(__dirname, buildConfig.srcFolder, 'lambda/handler', 'EmailFormHandler.ts')
    },
    output: {
        libraryTarget: 'umd',
        path: path.join(__dirname, buildConfig.distFolder),
        filename: `[name].js`,
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    devtool: isProduction ? undefined : 'inline-source-map',
    optimization: {
        minimize: false,
    },
    externals: ['aws-sdk'],
    target: 'node'
};
module.exports = webpackConfiguration;