let lastClientX, lastClientY, originWindowId;

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        lastClientX = request.lastClientX;
        lastClientY = request.lastClientY;
    }
);

chrome.runtime.onInstalled.addListener(function(){
    const openLinkContextMenuItem = {
        "id": "openInPopupWindow",
        "title": chrome.i18n.getMessage('openInPopupWindow'),
        "contexts": ["link"]
    };
    
    const openInMainWindowContextMenuItem = {
        "id": "openInMainWindow",
        "title": chrome.i18n.getMessage('openPageInMainWindow'),
        "visible": false,
        "contexts": ["page"]
    }
    
    const searchInPopupWindowContextMenuItem = {
        "id": "searchInPopupWindow",
        "title": chrome.i18n.getMessage('searchInPopupWindow'),
        "contexts": ["selection"]
    };

    chrome.contextMenus.create(openLinkContextMenuItem);
    chrome.contextMenus.create(openInMainWindowContextMenuItem);
    chrome.contextMenus.create(searchInPopupWindowContextMenuItem);
})


chrome.windows.onFocusChanged.addListener(
    function(w){
        if (w < 0) return; /// don't process when window lost focus
        chrome.windows.getCurrent(
            function(w){
                if (w.type == 'popup'){
                    chrome.contextMenus.update("openInMainWindow", {"visible": true});
                } else{
                    chrome.contextMenus.update("openInMainWindow", {"visible": false});
                }
            },
        );
    }
); 


chrome.storage.onChanged.addListener((changes) => {
    chrome.contextMenus.update("searchInPopupWindow", {"visible": changes.searchInPopupEnabled.newValue });
});


chrome.contextMenus.onClicked.addListener(function(clickData) {
    if (clickData.menuItemId == 'openInMainWindow') {
        chrome.tabs.create({url: clickData.pageUrl, active:false });
        return;
    }

    /// load configs
    loadUserConfigs(function(){
        let originalWindowIsFullscreen = false;

        /// store current windowId
        chrome.windows.getCurrent(
            function(originWindow){
                if (originWindow.type !== 'popup') originWindowId = originWindow.id;

                 /// if original window is fullscreen, unmaximize it (for MacOS)
                if (originWindow.state == 'fullscreen') {
                    originalWindowIsFullscreen = true;
                    chrome.windows.update(originWindow.id, {
                        'state': 'maximized'
                    });
                }
        });
    
        let dx, dy, height, width;
    
        // height = window.screen.height * 0.65, width = window.screen.height * 0.5;
        height = configs.popupHeight ?? 800, width = configs.popupWidth ?? 600;
        height = parseInt(height); width = parseInt(width);

        if (configs.tryOpenAtMousePosition == true && (lastClientX && lastClientY)) {
            /// open at last known mouse position
            dx = lastClientX - (width / 2), dy = lastClientY - (height / 2);
        } else {
            /// open at center of screen
            dx = (window.screen.width / 2) - (width / 2), dy = (window.screen.height / 2) - (height / 2);
        }
    
        /// check for screen overflow
        if (dx < 0) dx = 0;
        if (dy < 0) dy = 0;
        if (dx + width > window.screen.width) dx = dx - (dx + width - window.screen.width);
        if (dy + height > window.screen.height) dy = dy - (dy + height - window.screen.height);
        dx = Math.round(dx); dy = Math.round(dy);
    
        /// create popup window
        setTimeout(function () {
            chrome.windows.create({
                'url': clickData.menuItemId == 'searchInPopupWindow' ? configs.popupSearchUrl.replace('%s', clickData.selectionText) : clickData.linkUrl, 
                'type': configs.hideBrowserControls ? 'popup' : 'normal', 
                'width': width, 'height': height, 'top': dy, 'left': dx
            }, function (popupWindow) {
                /// set coordinates again (workaround for old firefox bug)
                chrome.windows.update(popupWindow.id, {
                    'top': dy, 'left': dx
                });
    
                if (configs.closeWhenFocusedInitialWindow == false) return;

                /// close popup on click parent window
                function windowFocusListener(windowId) {
                    if (windowId == originWindowId) {
                        chrome.windows.onFocusChanged.removeListener(windowFocusListener);
                        chrome.windows.remove(popupWindow.id);
    
                        if (originalWindowIsFullscreen) chrome.windows.update(parentWindow.id, {
                            'state': 'fullscreen'
                        });
                    }
                }
    
                setTimeout(function () {
                    chrome.windows.onFocusChanged.addListener(windowFocusListener);
                }, 300);
            });
        }, originalWindowIsFullscreen ? 600 : 0)
    });
 });