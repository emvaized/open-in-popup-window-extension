let lastClientX, lastClientY, originWindowId, lastClientHeight, lastClientWidth, lastPopupId;
let toolbarWidth, toolbarHeight, textSelection;

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.action == 'updateAspectRatio') {
            if (request.aspectRatio && configs.tryFitWindowSizeToImage) {
                chrome.windows.get(lastPopupId, function(w){
                    if (!w || lastPopupId < 0 || !request.aspectRatio) return;

                    let newWidth = (w.height - request.toolbarHeight) * request.aspectRatio;
                    if (newWidth > window.screen.availWidth)
                        newWidth = window.screen.availWidth * 0.7;
    
                    let dx = w.left;
                    if (dx + newWidth > window.screen.availWidth) 
                        dx = dx - (dx + newWidth - window.screen.availWidth);

                    newWidth = Math.round(newWidth);
                    dx = Math.round(dx);
                    chrome.windows.update(lastPopupId, {
                        'width': newWidth, 
                        'left': dx
                    });
                })
            }
            return;
        }

        lastClientX = request.lastClientX;
        lastClientY = request.lastClientY;
        lastClientHeight = request.clientHeight;
        lastClientWidth = request.clientWidth;
        textSelection = request.selectedText ?? '';

        if (request.link) {
            loadUserConfigs((cfg) => { 
                if (configs.openByDragAndDrop) {
                    const isViewer = request.nodeName == 'IMG' || request.nodeName == 'VIDEO';
                    openPopupWindowForLink(request.link, isViewer); 
                }
            });
        }
    }
);

const openLinkContextMenuItem = {
    "id": "openInPopupWindow",
    "title": chrome.i18n.getMessage('openInPopupWindow'),
    "contexts": ["link"]
}
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
}
const viewImageContextMenuItem = {
    "id": "viewInPopupWindow",
    "title": chrome.i18n.getMessage('viewInPopupWindow'),
    "contexts": ["image"]
}  

chrome.contextMenus.create(openLinkContextMenuItem);
chrome.contextMenus.create(openInMainWindowContextMenuItem);
chrome.contextMenus.create(searchInPopupWindowContextMenuItem);
chrome.contextMenus.create(viewImageContextMenuItem);

chrome.windows.onFocusChanged.addListener(function(w){
        if (w < 0) return; /// don't process when window lost focus
        chrome.windows.getCurrent(
            (w) => chrome.contextMenus.update("openInMainWindow", {"visible": w.type == 'popup'}),
        );
    }
); 

chrome.storage.onChanged.addListener((changes) => {
    chrome.contextMenus.update("searchInPopupWindow", {"visible": changes.searchInPopupEnabled.newValue });
    chrome.contextMenus.update("viewInPopupWindow", {"visible": changes.viewInPopupEnabled.newValue });
});

chrome.contextMenus.onClicked.addListener(function(clickData) {
    if (clickData.menuItemId == 'openInMainWindow') {
        chrome.tabs.create({url: clickData.pageUrl, active:false });
        return;
    }

    const link = clickData.menuItemId == 'searchInPopupWindow' ? 
        configs.popupSearchUrl.replace('%s', clickData.selectionText) 
        : clickData.menuItemId == 'viewInPopupWindow' ? clickData.srcUrl : clickData.linkUrl;
    openPopupWindowForLink(link, clickData.menuItemId == 'viewInPopupWindow');
 });

 function openPopupWindowForLink(link, isViewer = false) {
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
        if (isViewer && configs.tryFitWindowSizeToImage && lastClientHeight && lastClientWidth) {
            const aspectRatio = lastClientWidth / lastClientHeight;
            // width = ((height - toolbarHeight) * aspectRatio) + toolbarWidth;
            width = height * aspectRatio;
    
            if (width > window.screen.availWidth) {
                width = window.screen.availWidth * 0.7; 
            }
        }
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
        if (dx + width > window.screen.availWidth) dx = dx - (dx + width - window.screen.availWidth);
        if (dy + height > window.screen.availHeight) dy = dy - (dy + height - window.screen.availHeight);
        dx = parseInt(dx); dy = parseInt(dy);

        /// create popup window
        setTimeout(function () {
            chrome.windows.create({
                // 'url': link ?? configs.popupSearchUrl.replace('%s', textSelection), 
                'url': isViewer ? 
                    (configs.useBuiltInImageViewer ? link :
                        chrome.runtime.getURL('viewer/viewer.html') + '?src=' + link) :
                    link ?? configs.popupSearchUrl.replace('%s', textSelection), 
                'type': configs.hideBrowserControls ? 'popup' : 'normal', 
                'width': width, 'height': height, 'top': dy, 'left': dx
            }, function (popupWindow) {
                /// set coordinates again (workaround for firefox bug)
                chrome.windows.update(popupWindow.id, {
                    'top': dy, 'left': dx, 'width': width, 'height': height
                });

                if (configs.closeWhenFocusedInitialWindow) {
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
                }

                lastClientHeight = undefined; lastClientWidth = undefined;
                lastClientX = undefined; lastClientY = undefined;
                textSelection = undefined;
                lastPopupId = popupWindow.id;
            });
        }, originalWindowIsFullscreen ? 600 : 0)
    });
 }