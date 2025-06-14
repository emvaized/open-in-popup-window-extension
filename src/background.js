let mouseX, mouseY, elementHeight, elementWidth, lastPopupId;
let textSelection, availWidth, availHeight, availLeft;

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
        if (request.action == 'requestOpenInMainWindow') {
            loadUserConfigs((c) => {
                if (configs.escKeyClosesPopup && sender.tab)
                    moveTabToRegularWindow(sender.tab)
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

                    let newWidth = w.height * request.aspectRatio;
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
        availLeft = request.availLeft;

        if (request.type == 'drag' || request.type == 'shiftClick') {
            loadUserConfigs((cfg) => {
                if (request.type == 'drag' && configs.openByDragAndDrop == false) return;
                if (request.type == 'shiftClick' && configs.openByShiftClick == false) return;

                const isViewer = request.nodeName == 'IMG' || request.nodeName == 'VIDEO';
                if (isViewer && !cfg.viewInPopupEnabled) return;
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
const openPageContextMenuItem = {
    "id": "openPageInPopupWindow",
    "title": chrome.i18n.getMessage('openPageInPopupWindow'),
    "contexts": ["page"]
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
chrome.contextMenus.create(openPageContextMenuItem);
chrome.contextMenus.create(openInMainWindowContextMenuItem);
chrome.contextMenus.create(searchInPopupWindowContextMenuItem);
chrome.contextMenus.create(viewImageContextMenuItem);

/// Update context menu availability
chrome.windows.onFocusChanged.addListener(function(wId){
        if (wId == undefined || wId < 0) return; /// don't process when window lost focus
        chrome.windows.get(wId, {},
            (w) => { if (w) {
                chrome.contextMenus.update("openInMainWindow", {"visible": w.type == 'popup'});
                chrome.contextMenus.update("openPageInPopupWindow", {"visible": w.type !== 'popup'});
            } },
        );
    }
); 

/// Update configs
chrome.storage.onChanged.addListener((changes) => {
    if (changes.searchInPopupEnabled)
        chrome.contextMenus.update("searchInPopupWindow", {"visible": changes.searchInPopupEnabled.newValue });
    if (changes.viewInPopupEnabled)
        chrome.contextMenus.update("viewInPopupWindow", {"visible": changes.viewInPopupEnabled.newValue });
    if (changes.addOptionOpenPageInPopupWindow)
        chrome.contextMenus.update("openPageInPopupWindow", {"visible": changes.addOptionOpenPageInPopupWindow.newValue });
    applyUserConfigs(changes);
});

/// Reopen new single tab windows as popups
chrome.windows.onCreated.addListener(
    (w) => {
        loadUserConfigs((c) => {
            if (configs.reopenSingleTabWindowAsPopup && w.type == 'normal')
                setTimeout(()=> 
                    chrome.tabs.query({windowId: w.id}, (tabs) => {
                        if (tabs.length == 1){
                            const tab = tabs[0];
                            if (tab.url !== 'about:home' && tab.url !== 'about:privatebrowsing' &&
                                tab.url !== 'chrome://newtab/' &&tab.url !== 'edge://newtab/'
                            ) {
                                openPopupWindowForLink(undefined, false, false, tab.id)
                            }
                        } 
                    })
                , 5)
        })   
    }
)

chrome.contextMenus.onClicked.addListener(function(clickData, tab) {
    if (clickData.menuItemId == 'openInMainWindow') {
            if (tab) moveTabToRegularWindow(tab)
            // chrome.tabs.remove(tab.id);
            // chrome.tabs.create({ url: clickData.pageUrl, active: true });
        return;
    }
    
    if (clickData.menuItemId == 'openPageInPopupWindow') {
            if (tab) openPopupWindowForLink(clickData.pageUrl, false, false, undefined, true);
        return;
    }

    const link = clickData.menuItemId == 'searchInPopupWindow' ? 
        configs.popupSearchUrl.replace('%s', clickData.selectionText) 
        : clickData.menuItemId == 'viewInPopupWindow' ? clickData.srcUrl : clickData.linkUrl;
    openPopupWindowForLink(link, clickData.menuItemId == 'viewInPopupWindow');
 });

 function openPopupWindowForLink(link, isViewer = false, isDragEvent, tabId, isCurrentPage = false) {
    loadUserConfigs(function(){

        /* 
            This logic was created in order to counter MacOS behavior,
            where popup windows could not be opened above the fullscreen window.
            It should determine MacOS native fullscreen specifically
        */
        // let originalWindowIsFullscreen = false;
        // chrome.windows.getCurrent(
        //     function(originWindow){
        //         // if (originWindow.type !== 'popup') originWindowId = originWindow.id;

        //          /// if original window is fullscreen, unmaximize it (for MacOS)
        //         if (originWindow.state == 'fullscreen') {
        //             originalWindowIsFullscreen = true;
        //             chrome.windows.update(originWindow.id, {
        //                 'state': 'maximized'
        //             });
        //         }
        // });
    
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
        if (isDragEvent && configs.openDragAndDropUnderMouse) popupLocation = 'mousePosition';

        /// try to get current screen size (not supported in Manifest v3)
        try {
            availWidth = window.screen.width;
            availHeight = window.screen.height;
        } catch(e){}
        if (configs.debugMode) console.log('Initial availLeft: ', availLeft)
        if (!availLeft) availLeft = 0;

        function setCenterCoordinates(){
            if (availHeight && availWidth){
                dx =  availLeft + availWidth / 2;
                dy =  availHeight / 2;
            } else {
                dx = availLeft; dy = 0;
            }
            dx -= width / 2;
            dy -= height / 2;
        }

        function setCursorCoordinates(){
            if (mouseX && mouseY){
                dx = mouseX - (width / 2), dy = mouseY - (height / 2);
            } else {
                /// if no dx stored, switch to fallback
                setFallbackPopupLocation();
            }
        }

        function setFallbackPopupLocation(){
            setPopupLocation(configs.fallbackPopupWindowLocation ?? 'center');
        }

        function setPopupLocation(preference){
            switch(preference){
                case 'mousePosition': {
                    /// open at last known mouse position
                    setCursorCoordinates();
                } break;
                case 'nearMousePosition': {
                    if (!mouseX) {
                        setFallbackPopupLocation();
                    } else {
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
                                setFallbackPopupLocation();
                            }
                        }
                    }
                } break;
                case 'topRight': {
                    dx = availLeft + availWidth - width, 
                    dy = 0;
                } break;
                case 'topLeft': {
                    dx = availLeft, 
                    dy = 0;
                } break;
                case 'topCenter': {
                    setCenterCoordinates();
                    dy = 0;
                } break;
                case 'bottomRight': {
                    dx = availLeft + availWidth - width, 
                    dy = availHeight - height;
                } break;
                case 'bottomLeft': {
                    dx = availLeft, 
                    dy = availHeight - height;
                } break;
                default: {
                    /// open at center of screen
                    setCenterCoordinates();
                } break;
            }
        }
        setPopupLocation(popupLocation);

        if (configs.debugMode){
            console.log('~~~');
            console.log('Trying to open a popup window...');
            console.log('window.screen.width: ', window.screen.width);
            console.log('window.screen.availWidth: ', window.screen.availWidth);
            console.log('window.screenLeft: ', window.screenLeft);
            console.log('window.screenX: ', window.screenX);
            console.log('window.availLeft: ', window.screen.availLeft);
            console.log('availLeft: ', availLeft);
            console.log('Selected popup window placement: ', popupLocation);
            console.log('Calculated popup window dx: ', dx);
            console.log('Checking for dx overflow...');
        }
    
        /// check for screen overflow
        if (!dx) dx = 0;
        if (availLeft >= 0 && dx < 0) dx = 0;
        if (!dy || dy < 0) dy = 0;
        if (dy + height > availHeight) dy = dy - (dy + height - availHeight);
        dx = parseInt(dx); dy = parseInt(dy);
        if (dx + width > availWidth) dx = dx - (dx + width - availWidth);

        if (configs.debugMode){
            console.log('Calucated dx after checking: ', dx);
            console.log('Calucated dy after checking: ', dy);
            console.log('End logging ~~~');
        }
        
        /// create popup window
        // setTimeout(function () {
            const createParams = {
                'type': 'popup', 
                'width': width, 'height': height, 
                'top': dy, 'left': dx
            };

            if (tabId) {
                createParams.tabId = tabId;
            } else {
                createParams['url'] = isViewer ? 
                    (configs.useBuiltInImageViewer ? link :
                        chrome.runtime.getURL('viewer/viewer.html') + '?src=' + link) 
                    : link ?? (textSelection ? 
                        (configs.popupSearchUrl.replace('%s', textSelection))
                        : 'about:blank');
            }

            chrome.windows.create(createParams, function (popupWindow) {
                /// set coordinates again (workaround for old firefox bug)
                let popupWindowId = popupWindow.id;
                chrome.windows.update(popupWindowId, {
                    'top': dy, 'left': dx, 'width': width, 'height': height
                });

                /// close popup on focus normal window
                if (configs.closeWhenFocusedInitialWindow && (!isCurrentPage || !configs.keepOpenPageInPopupWindowOpen)){
                    function windowFocusListener(wId) {
                        if (wId > -1) 
                            chrome.windows.get(wId,{}, (w) => {
                                    if (w && w.type == 'normal') {
                                        chrome.windows.remove(popupWindowId);
                                        chrome.windows.onFocusChanged.removeListener(windowFocusListener);

                                        // if (originalWindowIsFullscreen) 
                                        //     chrome.windows.update(parentWindow.id, {
                                        //         'state': 'fullscreen'
                                        //     });
                                    }
                                });
                    }
        
                    setTimeout(function () {
                        chrome.windows.onFocusChanged.addListener(windowFocusListener);
                    }, 300);
                }

                /* remember dimensions on window resize 
                [draft until onBoundsChanged is supported in Firefox]
                {@link https://bugzilla.mozilla.org/show_bug.cgi?id=1762975}
                */
                // if (configs.rememberWindowResize){
                //     function resizeListener(w){
                //         const newSize = {
                //             'popupHeight': w.height,
                //             'popupWidth': w.width,
                //         }
                //         console.log(newSize);
                //         chrome.storage.sync.set(configs)

                //     }
                //     function removedListener(wId){
                //         if (wId && wId > -1 && wId == popupWindow.id) {
                //             chrome.windows.onBoundsChanged.removeListener(resizeListener);
                //             chrome.windows.onRemoved.removeListener(removedListener);
                //         }
                //     }
                //     chrome.windows.onBoundsChanged.addListener(resizeListener);
                //     chrome.windows.onRemoved.addListener(removedListener);
                // }

                /// clear variables
                elementHeight = undefined; elementWidth = undefined;
                mouseX = undefined; mouseY = undefined;
                textSelection = undefined;
                lastPopupId = popupWindow.id;
            });
        // }, originalWindowIsFullscreen ? 600 : 0)
    });
 }

 function moveTabToRegularWindow(tab){
    chrome.windows.getAll(
        { windowTypes: ['normal'] },
        function(windows){
            chrome.tabs.move(tab.id, { 
                    index: -1, 
                    windowId: windows[0].id
            }, function(t){
                // if (t && t[0]) chrome.tabs.update(t[0].id, { 'active': true });
                chrome.tabs.update(tab.id, { 'active': true });
            });
        }
    );
}

chrome.tabs.onCreated.addListener(newTab => {
    const openerId = newTab.openerTabId;
    if (openerId){
        loadUserConfigs((c) => {
            if (configs.reopenAutoCreatedTabAsPopup) {
                chrome.tabs.get(openerId, openerTab => {
                    if (openerTab) {
                        if (!configs.reopenAutoCreatedTabsOnlyPinned || openerTab.pinned) {
                            // chrome.tabs.remove(newTab.id);
                            // moveTabToPopupWindow(newTab);
                            openPopupWindowForLink(newTab.url, false, false, newTab.id);
                        } 
                    }
                });
            }
        }) 
    }
});