const configs = {
    'closeWhenFocusedInitialWindow': true,
    'hideBrowserControls': true,
    'popupHeight': 800,
    'popupWidth': 600,
    'viewInPopupEnabled': true,
    'searchInPopupEnabled': true,
    'translateInPopupEnabled': false,
    'popupSearchUrl': 'https://www.google.com/search?q=%s',
    'popupTranslateUrl': 'https://translate.google.com/?sl=auto&text=%s&op=translate',
    'openByDragAndDrop': false,
    'minimalDragDistance': 50,
    'tryFitWindowSizeToImage': true,
    'useBuiltInImageViewer': false,
    'openByModClick': true,
    'modifierKey': 'shift',
    'doubleModifierKeyPressTrigger': false,
    'escKeyClosesPopup': true,
    'reopenSingleTabWindowAsPopup': false,
    'reopenAutoCreatedTabAsPopup': false,
    'reopenAutoCreatedTabsOnlyPinned': true,
    'popupWindowLocation': 'nearMousePosition', /// possible values: mousePositon,nearMousePosition,center,etc
    'imageWithLinkPreferLink': false,
    'fallbackPopupWindowLocation': 'center',
    'debugMode': false,
    'openDragAndDropUnderMouse': true,
    'addOptionOpenPageInPopupWindow': true,
    'keepOpenPageInPopupWindowOpen': true,
    'screenWidth': 1920,
    'screenHeight': 1080,
    'availLeft': 0,
    'rememberWindowResize': false,
    'moveToMainWindowOnMaximize': true,
    'changeDragCursor': true,
    'copyTabInsteadOfMoving': true,
    'dimPageOnPopupOpen': true,
    'dimPageAmount': 0.3,
    'openByLongClick': false,
    'longClickButton': '0', /// possible: 0 for left, 1 for middle click
    'holdClickDelay': 600,
    'lookUpHighResImages': true,
    'dontClosePlayingPopup': true,
    'autoCloseOnlyOverlapping': false,
    'reuseExistingPopup': false,
    'reusePopupOnlyIfNoOverlap': false,
    'toolbarIconClickAction': 'showExtensionSettings', /// possible values: showExtensionSettings,openPageInPopupWindow,searchInPopupWindow
}

function loadUserConfigs(callback, specificKeys) {
    if (configs.loaded){
        // console.log('returned cached configs', configs);
        if (callback) callback(configs);
        return;
    }
    const keys = specificKeys ?? Object.keys(configs);
    chrome.storage.sync.get(
        keys, (cfg)=>{
            if (cfg) applyUserConfigs(cfg, keys);
            if (!specificKeys) configs.loaded = true;
            if (callback) callback(configs);
            // console.log('loaded configs from memory', specificKeys, configs);
        }
    );
}

function applyUserConfigs(cfg, keys, callback){
    if (!keys) keys = Object.keys(cfg);
    for (let i = 0, l = keys.length; i < l; i++) {
        const key = keys[i], value = cfg[key];
        if (value === undefined) continue;
        if (key === 'loaded') continue;
        configs[key] = value['newValue'] ?? value;
    }
    if (callback) callback(configs);
}
