let mouseX, mouseY, elementHeight, elementWidth, lastPopupId;
let toolbarHeight, textSelection, availWidth, availHeight;

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.action == 'requestEscPopupWindowClose') {
            loadUserConfigs((c) => {
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

        mouseX = request.mouseX;
        mouseY = request.mouseY;
        elementHeight = request.elementHeight;
        elementWidth = request.elementWidth;
        textSelection = request.selectedText ?? '';
        availWidth = request.availWidth;
        availHeight = request.availHeight;

        if (request.type == 'drag' || request.type == 'shiftClick') {
            loadUserConfigs((cfg) => {
                if (request.type == 'drag' && configs.openByDragAndDrop == false) return;
                if (request.type == 'shiftClick' && configs.openByShiftClick == false) return;

                const isViewer = request.nodeName == 'IMG' || request.nodeName == 'VIDEO';
                openPopupWindowForLink(request.link, isViewer, request.type == 'drag'); 
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

chrome.windows.onFocusChanged.addListener(function(wId){
        if (wId < 0) return; /// don't process when window lost focus
        chrome.windows.get(wId,{},
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
            chrome.tabs.query({active: true, lastFocusedWindow: true}, ([tab]) => {
                if (tab) {
                    /// filter by windowType doesn't seem to work in Firefox 130
                    // chrome.windows.getLastFocused(
                    //     { windowTypes: ['normal'] },
                    chrome.windows.getAll(
                        { windowTypes: ['normal'] },
                        function(windows){
                            chrome.tabs.move(tab.id, { index: 0, windowId: windows[0].id}, function(t){
                                if (t) chrome.tabs.update(t[0].id, { 'active': true });
                            });
                        }
                    );
                } 
            });
        return;
    }

    const link = clickData.menuItemId == 'searchInPopupWindow' ? 
        configs.popupSearchUrl.replace('%s', clickData.selectionText) 
        : clickData.menuItemId == 'viewInPopupWindow' ? clickData.srcUrl : clickData.linkUrl;
    openPopupWindowForLink(link, clickData.menuItemId == 'viewInPopupWindow');
 });

 function openPopupWindowForLink(link, isViewer = false, isDragEvent) {
    loadUserConfigs(function(){
        let originalWindowIsFullscreen = false;

        chrome.windows.getCurrent(
            function(originWindow){
                // if (originWindow.type !== 'popup') originWindowId = originWindow.id;

                 /// if original window is fullscreen, unmaximize it (for MacOS)
                if (originWindow.state == 'fullscreen') {
                    originalWindowIsFullscreen = true;
                    chrome.windows.update(originWindow.id, {
                        'state': 'maximized'
                    });
                }
        });
    
        /// calculate popup size
        let height, width;
    
        height = configs.popupHeight ?? 800, width = configs.popupWidth ?? 600;
        if (isViewer && configs.tryFitWindowSizeToImage && elementHeight && elementWidth) {
            const aspectRatio = elementWidth / elementHeight;
            width = height * aspectRatio;
    
            if (width > availWidth) {
                width = availWidth * 0.7; 
            }
        }
        height = parseInt(height); width = parseInt(width);


        /// calculate popup position
        let dx, dy;
        let popupLocation = configs.popupWindowLocation;
        if (isDragEvent) popupLocation = 'mousePosition';

        function setCenterCoordinates(){
            try {
                dx = window.screen.width / 2;
                dy = window.screen.height / 2;
            } catch(e){
                if (availHeight && availWidth){
                    dx =  availWidth / 2;
                    dy =  availHeight / 2;
                } else {
                    dx = 0; dy = 0;
                }
            }
            dx -= width / 2;
            dy -= height / 2;
        }

        function setCursorCoordinates(){
            if (mouseX && mouseY){
                dx = mouseX - (width / 2), dy = mouseY - (height / 2);
            } else {
                /// if no dx stored, open in center
                setCenterCoordinates();
            }
        }

        switch(popupLocation){
            case 'mousePosition': {
                /// open at last known mouse position
                setCursorCoordinates();
            } break;
            case 'nearMousePosition': {
                /// try to open on side near mouse position, where there's enough space

                // const verticalPadding = elementHeight;
                const verticalPadding = 15;
                const horizontalPadding = 15;
                dx = mouseX - (width / 2), dy = mouseY - height - verticalPadding;

                if (dy < 0) dy = mouseY + verticalPadding;
                if (dy + height > availHeight) {
                    dy = mouseY - (height / 2);
                    dx = mouseX - width - horizontalPadding;

                    if (dx < 0) dx = mouseX + horizontalPadding;
                    if (dx + width > availWidth){
                        /// if nothing works, open centered in mouse position
                        setCursorCoordinates();
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
                setCenterCoordinates();
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
                /// set coordinates again (workaround for old firefox bug)
                chrome.windows.update(popupWindow.id, {
                    'top': dy, 'left': dx, 'width': width, 'height': height
                });

                if (configs.closeWhenFocusedInitialWindow) {
                    /// close popup on focus normal window
                    function windowFocusListener(wId) {
                        // if (wId > -1) 
                            chrome.windows.get(wId,{}, (w) => {
                                    if (w.type == 'normal') {
                                        chrome.windows.remove(popupWindow.id);
                                        chrome.windows.onFocusChanged.removeListener(windowFocusListener);

                                        if (originalWindowIsFullscreen) 
                                            chrome.windows.update(parentWindow.id, {
                                                'state': 'fullscreen'
                                            });
                                    }
                                });
                    }
        
                    setTimeout(function () {
                        chrome.windows.onFocusChanged.addListener(windowFocusListener);
                    }, 300);
                }

                /// clear variables
                elementHeight = undefined; elementWidth = undefined;
                mouseX = undefined; mouseY = undefined;
                textSelection = undefined;
                lastPopupId = popupWindow.id;
            });
        }, originalWindowIsFullscreen ? 600 : 0)
    });
 }