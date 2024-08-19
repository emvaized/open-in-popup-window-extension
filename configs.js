const configs = {
    'closeWhenFocusedInitialWindow': true,
    'tryOpenAtMousePosition': true,
    'hideBrowserControls': true,
    'popupHeight': 800,
    'popupWidth': 600,
    'searchInPopupEnabled': true,
    'viewInPopupEnabled': true,
    'popupSearchUrl': 'https://www.google.com/search?q=%s',
    'openByDragAndDrop': false,
    'tryFitWindowSizeToImage': true,
}

function loadUserConfigs(callback) {
    const keys = Object.keys(configs);
    chrome.storage.sync.get(
        keys, (c)=>{
            const l = keys.length;
            for (let i = 0; i < l; i++) {
                const key = keys[i];
                if (c[key] !== undefined) configs[key] = c[key];
            }

            if (callback) callback(c);
        }
    );
}

function saveAllSettings(){
    chrome.storage.sync.set(configs)
}