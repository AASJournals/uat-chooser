const path = require('path');
const RemoveStrictPlugin = require( 'remove-strict-webpack-plugin' );

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
        minimize: false
    },
    plugins: [
        new RemoveStrictPlugin()
    ]
};
