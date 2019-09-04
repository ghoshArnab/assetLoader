/* eslint-disable import/prefer-default-export */
export const libs = [
  "pega-react.js",
  "pega-react-dom.js",
  "pega-cosmos.css",
  "pega-semantic.css",
  "pega-screenlayout.css",
  "pw-overrides.css",
  "pega-semantic-react.js",
  "pega-moment.js",
  "pega-moment-timezone.js",
  "pega-cosmos.js",
  "pega-react-renderer.js"
];
/* TODO : cosmos package needs to have a prod build with No PropType */
/* if (true || process.env.NODE_ENV === "development") { */
libs.splice(2, 0, "pega-prop-types.js");
/* } */

function getLibs() {
  return libs;
}

getLibs();
