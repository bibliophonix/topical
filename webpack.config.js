const path = require('path');

module.exports = {
    entry: './src/index.js',
    mode: 'production',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'topical.js',
        library: {
            name: 'topical',
            type: 'umd'
        }
    },
    module: {
        rules: [
            {
                test: /\.js/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [ '@babel/preset-env' ],
                        plugins: [ '@babel/plugin-proposal-class-properties' ]
                    }
                }
            }
        ]
    }
};
