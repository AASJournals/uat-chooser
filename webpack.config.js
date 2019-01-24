const path = require('path');
const RemoveStrictPlugin = require('remove-strict-webpack-plugin');

module.exports = {
    entry: path.resolve(__dirname, 'dist', 'combined.js'),
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'uat-chooser.js',
        libraryTarget: 'var',
        library: 'uat_chooser'
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    'css-loader'
                ]
            },
            {
                test: /\.(png|svg|jpg|gif)$/,
                use: [
                    'file-loader'
                ]
            }
        ]
    },
    optimization: {
        // it all breaks for me with '$(...) is null' if I don't do this!
        minimize: false
    },
    plugins: [
        // prototype.js does some gnarly stuff with `arguments.callee` that mean we need this:
        new RemoveStrictPlugin()
    ]
};
