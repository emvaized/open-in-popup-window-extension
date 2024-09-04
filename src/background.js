let lastClientX, lastClientY, originWindowId, lastClientHeight, lastClientWidth, lastPopupId;
let toolbarWidth, toolbarHeight, textSelection, availWidth, availHeight;

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.action == 'requestEscPopupWindowClose') {
            loadUserConfigs((cfg) => {
                if (configs.escKeyClosesPopup){
                    chrome.windows.getCurrent((w)=>{
                        if (w.type == 'popup')
                            chrome.windows.remove(w.id);
                    });
                }
            });
            return;
        }

        if (request.action == 'updateAspectRatio') {
            if (request.aspectRatio && configs.tryFitWindowSizeToImage) {
                chrome.windows.get(lastPopupId, function(w){
                    if (!w || lastPopupId < 0 || !request.aspectRatio) return;

                    if (request.availWidth) {
                        availWidth = request.availWidth;
                        availHeight = request.availHeight;
                    }

                    let newWidth = (w.height - request.toolbarHeight) * request.aspectRatio;
                    if (newWidth > availWidth)
                        newWidth = availWidth * 0.7;
    
                    let dx = w.left;
                    if (dx + newWidth > availWidth) 
                        dx = dx - (dx + newWidth - availWidth);

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
        availWidth = request.availWidth;
        availHeight = request.availHeight;

        if (request.type == 'drag' || request.type == 'shiftClick') {
            loadUserConfigs((cfg) => {
                if (request.type == 'drag' && configs.openByDragAndDrop == false) return;
                if (request.type == 'shiftClick' && configs.openByShiftClick == false) return;

                const isViewer = request.nodeName == 'IMG' || request.nodeName == 'VIDEO';
                openPopupWindowForLink(request.link, isViewer); 
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
    applyUserConfigs(changes);
});

chrome.contextMenus.onClicked.addListener(function(clickData) {
    if (clickData.menuItemId == 'openInMainWindow') {
        if (originWindowId){
            chrome.tabs.query({active: true, lastFocusedWindow: true}, ([tab]) => {
                if (tab) chrome.tabs.move(tab.id, { index: 0, windowId: originWindowId}, function(t){
                    if (t) chrome.tabs.update(tab.id, { 'active': true });
                });
            });
        } else {
            chrome.tabs.create({url: clickData.pageUrl, active:false });
        }
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
    
        height = configs.popupHeight ?? 800, width = configs.popupWidth ?? 600;
        if (isViewer && configs.tryFitWindowSizeToImage && lastClientHeight && lastClientWidth) {
            const aspectRatio = lastClientWidth / lastClientHeight;
            width = height * aspectRatio;
    
            if (width > availWidth) {
                width = availWidth * 0.7; 
            }
        }
        height = parseInt(height); width = parseInt(width);

        switch(configs.popupWindowLocation){
            case 'mousePosition': {
                /// open at last known mouse position
                dx = lastClientX - (width / 2), dy = lastClientY - (height / 2);
            } break;
            case 'nearMousePosition': {
                /// try to open on side near mouse position, where there's enough space
                const verticalPadding = lastClientHeight;
                const horizontalPadding = 15;
                dx = lastClientX - (width / 2), dy = lastClientY - height - verticalPadding;

                if (dy < 0) dy = lastClientY + verticalPadding;
                if (dy + height > availHeight) {
                    dy = lastClientY - (height / 2);
                    dx = lastClientX - width - horizontalPadding;

                    if (dx < 0) dx = lastClientX + horizontalPadding;
                    if (dx + width > availWidth){
                        /// if nothing works, open centered in mouse position
                        dx = lastClientX - (width / 2), dy = lastClientY - (height / 2);
                    }
                }
            } break;
            case 'topRight': {
                /// open in top right corner
                dx = availWidth - width, 
                dy = 0;
            } break;
            case 'topLeft': {
                /// open in top right corner
                dx = 0, 
                dy = 0;
            } break;
            case 'bottomRight': {
                /// open in top right corner
                dx = availWidth - width, 
                dy = availHeight - height;
            } break;
            case 'bottomLeft': {
                /// open in top right corner
                dx = 0, 
                dy = availHeight - height;
            } break;
            default: {
                /// open at center of screen
                dx = (availWidth / 2) - (width / 2), 
                dy = (availHeight / 2) - (height / 2);
            } break;
        }
    
        /// check for screen overflow
        if (!dx || dx < 0) dx = 0;
        if (!dy || dy < 0) dy = 0;
        if (dx + width > availWidth) dx = dx - (dx + width - availWidth);
        if (dy + height > availHeight) dy = dy - (dy + height - availHeight);
        dx = parseInt(dx); dy = parseInt(dy);

        /// create popup window
        setTimeout(function () {
            chrome.windows.create({
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