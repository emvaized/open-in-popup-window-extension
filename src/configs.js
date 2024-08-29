const configs = {
    'closeWhenFocusedInitialWindow': true,
    'hideBrowserControls': true,
    'popupHeight': 800,
    'popupWidth': 600,
    'searchInPopupEnabled': true,
    'viewInPopupEnabled': true,
    'popupSearchUrl': 'https://www.google.com/search?q=%s',
    'openByDragAndDrop': false,
    'tryFitWindowSizeToImage': true,
    'useBuiltInImageViewer': false,
    'openByShiftClick': false,
    'popupWindowLocation': 'mousePosition' /// possible values: mouse,center,bottomRight,topRight,bottomLeft,topLeft
}

function loadUserConfigs(callback) {
    const keys = Object.keys(configs);
    chrome.storage.sync.get(
        keys, (cfg)=>{
            if (cfg){
                const l = keys.length;
                for (let i = 0; i < l; i++) {
                    const key = keys[i];
                    if (cfg[key] !== undefined) configs[key] = cfg[key];
                }
            }

            if (callback) callback(configs);
        }
    );
}
