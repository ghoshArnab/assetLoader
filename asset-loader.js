import ComponentRegistry from "../components-registry";

/**
 * Exposes APIs to load the script files and 
 * css files.
 * It reads the script mapping from components_map.js file.
 */

let staticServerURL;

/* TODO: Versioning Support */
let loadedComponents = {};

export const ASSET_TYPES = {
    SCRIPT: "script",
    STYLE: "link"
};

/**
 * @description
 * Server url to fetch static content.
 * @param {string} url Server url to fetch static content 
 */
export const initServer = (url) => {
    staticServerURL = url;
};

/**
 * @description
 * Loads the script into browser
 * @param {*} url script url
 * @param {*} type type of script tag eq., script or link
 */
let loadAsset = (url, type) => {
    /* TODO: Asynchronously load CSS  */
    return new Promise((resolve, reject) => {
        const element = document.createElement(type);

        // Important success and error for the promise
        element.onload = () => {
            resolve(url);
        };
        element.onerror = () => {
            reject(url);
        };

        // Need to set different attributes depending on tag type
        if (type === 'script') {
            element.async = false;
            element.src = url;
        } else {
            element.type = 'text/css';
            element.rel = 'stylesheet';
            element.href = url;
        }
        // Inject into document to kick off loading
        document.head.appendChild(element);
    });
}

/**
 * @description
 * Loads the scripts from dependencies list.
 * It reads the dependency from components map and process
 * the scripts mapped in it.
 * Once all scripts loaded sucessfully, it call render.
 * @param {*} components components list eq., section...
 * @returns promise
 */
export const loadAssets = (components) => {
    if(!components) {
        return Promise.resolve();
    }

    let assetPromises = [];
    components.forEach(name => {
        /* To avoid loading mutiple times */
        if (loadedComponents[name]) {
            return;
        }
        if(name.indexOf(".js") !== -1){
            assetPromises.push(loadAsset(staticServerURL + name, ASSET_TYPES.SCRIPT));
        } else if(name.indexOf(".css") !== -1){
            loadAsset(staticServerURL + name, ASSET_TYPES.STYLE);
        } else {
            let component = ComponentRegistry.getComponent(name);
            if (!component) {
                return;
            }
            const scripts = component.scripts || [];
            scripts.forEach(src => {
                const srcUrl = src.startsWith('http') ? src : staticServerURL + src;
                assetPromises.push(loadAsset(srcUrl, ASSET_TYPES.SCRIPT));
            });

            const styles = component.styles || [];
            styles.forEach(href => {
                assetPromises.push(loadAsset(staticServerURL + href, ASSET_TYPES.STYLE));
            });
        }
        loadedComponents[name] = true;
    });
    return Promise.all(assetPromises);
}
