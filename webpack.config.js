const path = require("path");
const fs = require("fs");
const nodeEval = require("node-eval");
const webpack = require("webpack");
const replaceFile = require("replace-in-file");
const nodeExternals = require("webpack-node-externals");
const CopyWebpackPlugin = require("copy-webpack-plugin");
// const HtmlWebpackPlugin = require("html-webpack-plugin");
// const MinifyPlugin = require("babel-minify-webpack-plugin");
const CompressionPlugin = require("compression-webpack-plugin");

const isDevelopmentEnv = process.env.NODE_ENV === "development";
const mode = isDevelopmentEnv ? "development" : "production";
const EVAL_SOURCE_MAP = "eval-source-map";
const NONE = "none";
const BABEL_LOADER = "babel-loader";
const EXT_REACT = "pega-react.js";
const EXT_REACT_DOM = "pega-react-dom.js";
const EXT_PROP_TYPE = "pega-prop-types.js";
const EXT_MOMENT = "pega-moment.js";
const EXT_MOMENT_TIMEZONE = "pega-moment-timezone.js";
const EXT_PEGA_REACT_RENDERER = "pega-react-renderer.js";
const EXT_COSMOS = "pega-cosmos.js";
const EXT_SEMANTIC_CSS = "pega-semantic.css";
const EXT_COSMOS_CSS = "pega-cosmos.css";
const EXT_SCRLAYOUT_CSS = "pega-screenlayout.css";
const EXT_PW_CSS = "pw-overrides.css";
const COMPONENTS_MAP = "./src/components_map.js";
let libData = "";
let componentMapOrigData = "";
const commonPluginsToAdd = [];
const compressionConfObj = {
  filename: "[path].br[query]",
  algorithm: "brotliCompress",
  test: /\.(js|css|html|svg|png|jpg)$/,
  compressionOptions: { level: 11 }
};

const externals = {
  react: "React",
  "react-dom": "ReactDOM",
  "semantic-ui-react": "Semantic",
  moment: "moment",
  cosmos: "Cosmos",
  "constellationui-core": "constellationCore"
};

if (isDevelopmentEnv) {
  externals["prop-types"] = "PropTypes";
  console.log("\x1b[32m%s\x1b[0m", "Running webpack in development mode!");
} else {
  commonPluginsToAdd.push(new CompressionPlugin(compressionConfObj));
}

const options = {
  importType: moduleName => externals[moduleName]
};

function toObjectMap() {
  const componentMappedObj = {};
  componentMapOrigData = fs.readFileSync(COMPONENTS_MAP);
  const componentMapData = componentMapOrigData
    .toString()
    .substring(
      componentMapOrigData.toString().indexOf("/* End-Import */"),
      componentMapOrigData
        .toString()
        .indexOf("/* Hashed component map Start */")
    );
  const componentMapDataEval = nodeEval(componentMapData);
  const distName = `${__dirname}/src/`;
  let scriptPathToEntry;
  Object.keys(componentMapDataEval).forEach(key => {
    if (
      typeof componentMapDataEval[key] === "object" &&
      componentMapDataEval[key].scripts &&
      componentMapDataEval[key].component
    ) {
      const [script0, script1] = componentMapDataEval[key].scripts;
      scriptPathToEntry = script0;
      /* special case for map control */
      if (scriptPathToEntry.indexOf("http") >= 0 && script1) {
        scriptPathToEntry = script1;
      }
      componentMappedObj[scriptPathToEntry.replace(".js", "")] =
        distName + scriptPathToEntry;
    }
  });
  global.componentMap = componentMapDataEval;
  return componentMappedObj;
}

function singleScript(namespace, output, file, isHashingSupport) {
  return {
    mode,
    target: "web",
    devtool: isDevelopmentEnv ? EVAL_SOURCE_MAP : NONE,
    entry: {
      processor: path.join(__dirname, file)
    },
    output: {
      path: `${__dirname}/dist`,
      filename: isHashingSupport
        ? `${output}.[contenthash].js`
        : `${output}.js`,
      library: namespace
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          use: BABEL_LOADER
        }
      ]
    },
    externals: [nodeExternals(options)],
    plugins: commonPluginsToAdd
  };
}

const pluginsToAdd = [];
const externalLibsDistFile = {};
// new MinifyPlugin()
/* pluginsToAdd.push(new HtmlWebpackPlugin({
    minify : {
      removeComments: true,
      collapseWhitespace: true,
      removeRedundantAttributes: true,
      useShortDoctype: true,
      removeEmptyAttributes: true,
      removeStyleLinkTypeAttributes: true,
      keepClosingSlash: true,
      minifyJS: true,
      minifyCSS: true,
      minifyURLs: true,
    }
  }
)); */
pluginsToAdd.push(
  new CopyWebpackPlugin([
    {
      from: `${__dirname}/test/*_portal.html`,
      to: `${__dirname}/dist/`
    },
    {
      from: `${__dirname}/src/components/**/*.json`,
      to: `${__dirname}/dist/`,
      transformPath(from) {
        return from.replace("src/", "");
      }
    },
    // Copy over any sample JPG, PNG or MP4 files in a component folder
    //  to dist/static (without path info)
    {
      from: `${__dirname}/src/components/**/*.mp4`,
      to: `${__dirname}/dist/`,
      transformPath(from) {
        const tailOnly = from.substr(from.lastIndexOf("/"));
        // console.log( "tailOnly: " + tailOnly );
        return `static${tailOnly}`;
      }
    },
    {
      from: `${__dirname}/src/components/**/*.jpg`,
      to: `${__dirname}/dist/`,
      transformPath(from) {
        const tailOnly = from.substr(from.lastIndexOf("/"));
        return `static${tailOnly}`;
      }
    },
    {
      from: `${__dirname}/src/components/**/*.png`,
      to: `${__dirname}/dist/`,
      transformPath(from) {
        const tailOnly = from.substr(from.lastIndexOf("/"));
        return `static${tailOnly}`;
      }
    },
    /* copying libs from node modules to dist */
    {
      from: `${__dirname}/node_modules/react/umd/react.production.min.js`,
      to: `${__dirname}/dist/`,
      transformPath() {
        const hash = require("md5-file").sync(
          `${__dirname}/node_modules/react/umd/react.production.min.js`
        );
        externalLibsDistFile[EXT_REACT] = `pega-react.${hash}.js`;
        return externalLibsDistFile[EXT_REACT];
      }
    },
    {
      from: `${__dirname}/node_modules/react-dom/umd/react-dom.production.min.js`,
      to: `${__dirname}/dist/`,
      transformPath() {
        const hash = require("md5-file").sync(
          `${__dirname}/node_modules/react-dom/umd/react-dom.production.min.js`
        );
        externalLibsDistFile[EXT_REACT_DOM] = `pega-react-dom.${hash}.js`;
        return externalLibsDistFile[EXT_REACT_DOM];
      }
    },
    {
      from: `${__dirname}/node_modules/prop-types/prop-types.min.js`,
      to: `${__dirname}/dist/`,
      transformPath() {
        const hash = require("md5-file").sync(
          `${__dirname}/node_modules/prop-types/prop-types.min.js`
        );
        externalLibsDistFile[EXT_PROP_TYPE] = `pega-prop-types.${hash}.js`;
        return externalLibsDistFile[EXT_PROP_TYPE];
      }
    },
    /* Commenting as Moment and momentTimeZone is ESM, TODO: Need to correct */
    {
      from: `${__dirname}/node_modules/moment/min/moment.min.js`,
      to: `${__dirname}/dist/`,
      transformPath() {
        const hash = require("md5-file").sync(
          `${__dirname}/node_modules/moment/min/moment.min.js`
        );
        externalLibsDistFile[EXT_MOMENT] = `pega-moment.${hash}.js`;
        return externalLibsDistFile[EXT_MOMENT];
      }
    },
    {
      from: `${__dirname}/node_modules/moment-timezone/builds/moment-timezone.min.js`,
      to: `${__dirname}/dist/`,
      transformPath() {
        const hash = require("md5-file").sync(
          `${__dirname}/node_modules/moment-timezone/builds/moment-timezone.min.js`
        );
        externalLibsDistFile[
          EXT_MOMENT_TIMEZONE
        ] = `pega-moment-timezone.${hash}.js`;
        return externalLibsDistFile[EXT_MOMENT_TIMEZONE];
      }
    },
    {
      /* TODO : Update cosmos min file for production */
      /* from: isDevelopmentEnv ? 
        `${__dirname}/node_modules/cosmos/dist/cosmos.js` : 
        `${__dirname}/node_modules/cosmos/dist/cosmos.js`,
      */
      from: `${__dirname}/node_modules/cosmos/dist/cosmos.js`,
      to: `${__dirname}/dist/`,
      transformPath() {
        const cosmosProd = `${__dirname}/node_modules/cosmos/dist/cosmos.js`;
        const cosmosDev = `${__dirname}/node_modules/cosmos/dist/cosmos.js`;
        let hash = "";
        if (isDevelopmentEnv) {
          hash = require("md5-file").sync(cosmosDev);
        } else {
          hash = require("md5-file").sync(cosmosProd);
        }

        externalLibsDistFile[EXT_COSMOS] = `pega-cosmos.${hash}.js`;
        return externalLibsDistFile[EXT_COSMOS];
      }
    },
    {
      from: `${__dirname}/node_modules/constellationui-core/dist/esm/constellation-core.js`,
      to: `${__dirname}/dist/constellation-core.js`
    },
    {
      from: `${__dirname}/src/component_definitions/**/*.json`,
      to: `${__dirname}/dist/`,
      transformPath(from) {
        return from.replace("src/", "");
      }
    },
    {
      from: `${__dirname}/node_modules/semantic-ui-css/semantic.min.css`,
      to: `${__dirname}/dist/`,
      transformPath() {
        const hash = require("md5-file").sync(
          `${__dirname}/node_modules/semantic-ui-css/semantic.min.css`
        );
        externalLibsDistFile[EXT_SEMANTIC_CSS] = `pega-semantic.${hash}.css`;
        return externalLibsDistFile[EXT_SEMANTIC_CSS];
      }
    },
    {
      from: `${__dirname}/node_modules/cosmos/dist/cosmos.css`,
      to: `${__dirname}/dist/`,
      transformPath() {
        const hash = require("md5-file").sync(
          `${__dirname}/node_modules/cosmos/dist/cosmos.css`
        );
        externalLibsDistFile[EXT_COSMOS_CSS] = `pega-cosmos.${hash}.css`;
        return externalLibsDistFile[EXT_COSMOS_CSS];
      }
    },
    {
      from: `${__dirname}/src/components/screenlayout/index.css`,
      to: `${__dirname}/dist/`,
      transformPath() {
        const hash = require("md5-file").sync(
          `${__dirname}/src/components/screenlayout/index.css`
        );
        externalLibsDistFile[EXT_SCRLAYOUT_CSS] = `pega-screenlayout.${hash}.css`;
        return externalLibsDistFile[EXT_SCRLAYOUT_CSS];
      }
    },
    {
      from: `${__dirname}/src/components/screenlayout/pw-overrides.css`,
      to: `${__dirname}/dist/`,
      transformPath() {
        const hash = require("md5-file").sync(
          `${__dirname}/src/components/screenlayout/pw-overrides.css`
        );
        externalLibsDistFile[EXT_PW_CSS] = `pw-overrides.${hash}.css`;
        return externalLibsDistFile[EXT_PW_CSS];
      }
    }
  ])
);

if (process.argv.length > 3 && process.argv[3] === "-y") {
  const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
  console.log("Analysing !!");
  pluginsToAdd.push(new BundleAnalyzerPlugin());
}
if (!isDevelopmentEnv)
  pluginsToAdd.push(new CompressionPlugin(compressionConfObj));

const reactRenderConf = {
  mode,
  target: "web",
  devtool: isDevelopmentEnv ? EVAL_SOURCE_MAP : NONE,
  entry: {
    processor: path.join(__dirname, "/src/renderer/react_renderer.js")
  },
  output: {
    path: `${__dirname}/dist`,
    filename: "pega-react-renderer.[contenthash].js",
    library: "PegaReactRenderer"
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: BABEL_LOADER
      }
    ]
  },
  externals: [nodeExternals(options)],
  plugins: commonPluginsToAdd
};
const reactRenderCompiler = webpack(reactRenderConf);

const extLibsConf = {
  mode,
  target: "web",
  devtool: isDevelopmentEnv ? EVAL_SOURCE_MAP : NONE,
  entry: {
    path: path.join(__dirname, "/src/libs.js")
  },
  output: {
    path: `${__dirname}/dist`,
    filename: "pega-external-libs.js",
    library: "PegaExternalLibs"
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: BABEL_LOADER
      }
    ]
  },
  externals: [nodeExternals(options)],
  plugins: commonPluginsToAdd
};
const extLibsCompiler = webpack(extLibsConf);

function createConstellationHash() {
  const constellationCoreHash = require("md5-file").sync(
    `${__dirname}/dist/constellation-core.js`
  );
  const libHash = require("md5-file").sync(
    `${__dirname}/dist/pega-external-libs.js`
  );
  const hashStr = `export const buildHash = { constellationCoreHash: '${constellationCoreHash}', libHash: '${libHash}' }`;
  const hashFile = `${__dirname}/dist/constellation-hash.js`;
  /* Inject code */
  fs.writeFile(hashFile, hashStr, err => {
    if (err) console.log(err);
    console.log("Successfully Written to Hash File.");
  });
}

function revertLibsAndComponentmap() {
  /* revert libs.js and components_map.js */
  const libFile = `${__dirname}/src/libs.js`;
  const comMapFile = `${__dirname}/src/components_map.js`;
  fs.writeFile(libFile, libData, err => {
    if (err) console.log(err);
    console.log("Successfully Re-written libs File.");
  });
  fs.writeFile(comMapFile, componentMapOrigData, err => {
    if (err) console.log(err);
    console.log("Successfully Re-written component map File.");
  });
}

function extLibsCallback() {
  /* fetch the libs file by reading and eval it */
  libData = fs.readFileSync("./src/libs.js");
  const extLibs = nodeEval(libData.toString().replace(/export /g, ""));

  /* const extLibs = [
    "pega-react.js",
    "pega-react-dom.js",
    "pega-prop-types.js",
    "pega-semantic-react.js",
    "pega-moment.js",
    "pega-moment-timezone.js",
    "pega-cosmos.js",
    "pega-react-renderer.js"
  ]; */
  const ModifiedObj = [];
  extLibs.forEach(key => {
    if (externalLibsDistFile[key]) {
      ModifiedObj.push(externalLibsDistFile[key]);
    } else {
      ModifiedObj.push(key);
    }
  });
  const strArr = `/* eslint-disable import/prefer-default-export */export const libs = ${JSON.stringify(
    ModifiedObj,
    null,
    4
  )};`;
  const mapJSONLoc = `${__dirname}/src/libs.js`;
  /* Inject code */
  fs.writeFile(mapJSONLoc, strArr, err => {
    if (err) console.log(err);
    console.log("Successfully Written to File.");
  });
  extLibsCompiler.run(() => {
    createConstellationHash();
    revertLibsAndComponentmap();
  });
}

function reactRendererCallback() {
  const absPathForReactRenderer = `${__dirname}/dist/`;
  fs.readdirSync(absPathForReactRenderer).forEach(file => {
    if (
      file.indexOf("pega-react-renderer") >= 0 &&
      file.indexOf(".js.gz") === -1 &&
      file.indexOf(".js.br") === -1
    ) {
      externalLibsDistFile[EXT_PEGA_REACT_RENDERER] = file;
    }
  });
  extLibsCallback();
}
function getStringFromObj(obj) {
  // keep a list of serialized functions
  const functions = [];
  // json replacer - returns a placeholder for functions
  function jsonReplacer(key, val) {
    if (typeof val === "function") {
      functions.push(
        val
          .toString()
          .replace(/\s/g, "")
          .replace(key, "function")
      );
      return `{func_${functions.length - 1}}`;
    }
    return val;
  }
  // regex replacer - replaces placeholders with functions
  function funcReplacer(match, id) {
    return functions[id];
  }
  return JSON.stringify(obj, jsonReplacer).replace(
    /"\{func_(\d+)\}"/g,
    funcReplacer
  );
}

function globCallback() {
  let folderName;
  // let fileName;
  let absPath;
  const newChangedMap = { ...global.componentMap };
  const clonedMap = global.componentMap;
  Object.keys(clonedMap).forEach(key => {
    if (
      typeof clonedMap[key] === "object" &&
      clonedMap[key].scripts &&
      clonedMap[key].component
    ) {
      const scriptArr = clonedMap[key].scripts;
      scriptArr.forEach((eachScript, index) => {
        if (eachScript.indexOf("http") === -1) {
          folderName = path.dirname(eachScript);
          // fileName = path.basename(eachScript);
          absPath = `${__dirname}/dist/${folderName}`;
          fs.readdirSync(absPath).forEach(file => {
            /* TODO: Multiple component sources */
            if (
              file.indexOf(".js.gz") === -1 &&
              file.indexOf(".js.br") === -1
            ) {
              newChangedMap[key].scripts[index] = `${folderName}/${file}`;
            }
          });
        }
      });
    }
  });
  // create a component_json_map
  const data = getStringFromObj(newChangedMap);
  const newData = `/* Hashed component map Start */const hashedComponentsMap = ${data} ;getComponentsRegistry().mergeComponentsMap(hashedComponentsMap);/* End */`;
  // Replace logic
  const regDelim = /\/\* Hashed component map Start \*\/(.*?)\/\* End \*\//gs;
  const optionsParam = {
    files: `${__dirname}/src/components_map.js`,
    from: regDelim,
    to: newData
  };
  try {
    replaceFile.sync(optionsParam);
  } catch (error) {
    console.error("Error occurred:", error);
  }
  reactRenderCompiler.run(() => {
    reactRendererCallback();
  });
}

const globConfig = {
  mode,
  target: "web",
  devtool: isDevelopmentEnv ? EVAL_SOURCE_MAP : NONE,
  devServer: {
    disableHostCheck: true,
    inline: true,
    contentBase: `${__dirname}/dist`,
    port: 3000,
    headers: { "Access-Control-Allow-Origin": "*" }
  },
  entry: toObjectMap(),
  output: {
    filename: chunkData => {
      const chunk = chunkData.chunk.name;
      const chunkName = chunk.split("/")[1];
      const chunkPath = chunk.substring(0, chunk.lastIndexOf("/"));
      return `${chunkPath}/${chunkName}.[contenthash].js`;
    },
    path: `${__dirname}/dist`
  },
  module: {
    rules: [
      // "oneOf" will traverse all following loaders until one will
      // match the requirements. When no loader matches it will fall
      // back to the "file" loader at the end of the loader list.
      {
        oneOf: [
          {
            test: /\.js$/,
            exclude: /node_modules\/(?!constellationui-core)/,
            loader: BABEL_LOADER
          },
          {
            test: /\.css|.scss$/,
            exclude: /\.module\.(scss|sass)$/,
            loader: ["style-loader", "css-loader"]
          },
          {
            test: /\.module\.(scss|sass)$/,
            use: [
              {
                loader: "style-loader"
              },
              {
                loader: "css-loader",
                options: {
                  sourceMap: true,
                  modules: true,
                  localIdentName: "component--[local]-[hash:base64:6]"
                }
              },
              {
                loader: "sass-loader",
                options: {
                  sourceMap: true,
                  modules: true,
                  localIdentName: "component--[local]-[hash:base64:6]"
                }
              }
            ]
          },
          {
            loader: require.resolve('file-loader'),
            // Exclude `js` files to keep "css" loader working as it injects
            // its runtime that would otherwise be processed through "file" loader.
            // Also exclude `html` and `json` extensions so they get processed
            // by webpacks internal loaders.
            exclude: [/\.(js|mjs|jsx|ts|tsx)$/, /\.html$/, /\.json$/],
            options: {
              name: 'static/media/[name].[ext]',
            },
          },
        ],
      }
    ]
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        /* "react": {
        test: /react/,   // <-- use the test property to specify which deps go here
        chunks: "all",
        name: "pega-react.js",
        enforce: true,
        priority:1  // use the priority, to tell where a shared dep should go
      },
      "react-dom": {
        test: /react-dom/, // <-- use the test property to specify which deps go here
        chunks: "all",
        name: "pega-react-dom.js",
        enforce: true,
        priority: 2
      } */
      }
    }
  },
  externals: [nodeExternals(options)],
  plugins: pluginsToAdd
};
webpack(globConfig, globCallback);

module.exports = [
  singleScript(
    "Semantic",
    "pega-semantic-react",
    "/node_modules/semantic-ui-react",
    false
  )
];
