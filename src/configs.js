const configs = {
    'closeWhenFocusedInitialWindow': true,
    'hideBrowserControls': true,
    'popupHeight': 800,
    'popupWidth': 600,
    'searchInPopupEnabled': true,
    'viewInPopupEnabled': true,
    'popupSearchUrl': 'https://www.google.com/search?q=%s',
    'openByDragAndDrop': false,
    'minimalDragDistance': 50,
    'tryFitWindowSizeToImage': true,
    'useBuiltInImageViewer': false,
    'openByShiftClick': false,
    'escKeyClosesPopup': false,
    'reopenSingleTabWindowAsPopup': false,
    'popupWindowLocation': 'mousePosition', /// possible values: mousePositon,nearMousePosition,center,etc
    'imageWithLinkPreferLink': false,
    'fallbackPopupWindowLocation': 'center',
    //, 'rememberWindowResize': false,
    'debugMode': false,
    'openDragAndDropUnderMouse': true,
    'addOptionOpenPageInPopupWindow': true,
    'keepOpenPageInPopupWindowOpen': false,
}

function loadUserConfigs(callback) {
    const keys = Object.keys(configs);
    chrome.storage.sync.get(
        keys, (cfg)=>{
            if (cfg) applyUserConfigs(cfg, keys);
            if (callback) callback(configs);
        }
    );
}

function applyUserConfigs(cfg, keys){
    if (!keys) keys = Object.keys(cfg);
    const l = keys.length;
    for (let i = 0; i < l; i++) {
        const key = keys[i];
        if (cfg[key] !== undefined) configs[key] = cfg[key];
    }
}
