const path = require('path');

class RemoveStrictCustomPlugin {
    apply(compiler) {
        compiler.hooks.emit.tap('RemoveStrictCustomPlugin', (compilation) => {
            for (const name in compilation.assets) {
                if (name.endsWith('.js')) {
                    const source = compilation.assets[name].source();
                    const modified = source.replace(/(['"])use strict\1;?/g, '');
                    compilation.assets[name] = {
                        source: () => modified,
                        size: () => modified.length
                    };
                }
            }
        });
    }
}
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
        new RemoveStrictCustomPlugin()
    ]
};
