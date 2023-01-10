require("esbuild").build({
    entryPoints: ["src/index.js"],
    bundle: true,
    minify: true,
    outfile: "dist/topical.js",
    platform: "node",
    target: "es6",
}).catch(() => process.exit(1))
