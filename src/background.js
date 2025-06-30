let mouseX, mouseY, elementHeight, elementWidth, lastPopupId, lastNormalWindowId;
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

        /// Check if boundsChanged event is available for the options page
        if (request.action == 'checkOnBoundsChangedAvailability') {
            sendResponse(typeof chrome.windows.onBoundsChanged);
            console.log(typeof chrome.windows.onBoundsChanged)
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
                openPopupWindowForLink(request.link, isViewer, request.type == 'drag', false, false, cfg); 
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
    "contexts": ["page_action"] /// change to "page" when should be available
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
                chrome.contextMenus.update("openInMainWindow", {"visible": w.type == 'popup', "contexts": w.type == 'popup' ? ["page"] : ["page_action"] });
                loadUserConfigs((c) => {
                    chrome.contextMenus.update("openPageInPopupWindow", {"visible": w.type !== 'popup' && configs.addOptionOpenPageInPopupWindow, "contexts": w.type == 'popup' ? ["page_action"] : ["page"]});
                });
                if (w.type == 'normal') lastNormalWindowId = wId;
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

    setToolbarIconClickAction();
});

chrome.contextMenus.onClicked.addListener(function(clickData, tab) {
    if (clickData.menuItemId == 'openInMainWindow') {
            if (tab) moveTabToRegularWindow(tab)
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

 function openPopupWindowForLink(link, isViewer = false, isDragEvent, tabId, isCurrentPage = false, cfg, forceFallbackLocation = false) {
    const callback = function(){

        /* 
            This logic was created in order to counter MacOS behavior,
            where popup windows could not be opened above the fullscreen window.
            It should detect MacOS native fullscreen, but causes issues on other platforms, so it is disabled for now.
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
        if (!availLeft) availLeft = configs.availLeft ?? 0;
        if (!availWidth) availWidth = configs.screenWidth;
        if (!availHeight) availHeight = configs.screenHeight;
        if (configs.debugMode) console.log('availWidth: ', availWidth, 'availHeight: ', availHeight);

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

        if (forceFallbackLocation) {
            setFallbackPopupLocation();
        } else {
            setPopupLocation(popupLocation);
        }

        if (configs.debugMode){
            console.log('~~~');
            console.log('Trying to open a popup window...');
            console.log('availWidth: ', availWidth);
            console.log('availHeight: ', availHeight);
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
                if (!popupWindow) return;

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
                                            chrome.windows.get(popupWindowId,{}, (w) => {
                                                if (w){
                                                    if (w.state == 'minimized') return; /// don't close minimized popup window
                                                    if (w.alwaysOnTop) return; /// don't close always-on-top window
                                                    chrome.windows.remove(popupWindowId);
                                                    chrome.windows.onFocusChanged.removeListener(windowFocusListener);
                                                } else {
                                                    chrome.windows.onFocusChanged.removeListener(windowFocusListener);
                                                }
                                            });
                                        // if (originalWindowIsFullscreen) 
                                        //     chrome.windows.update(parentWindow.id, {
                                        //         'state': 'fullscreen'
                                        //     });
                                    }
                                });
                    }
        
                    // setTimeout(function () {
                        chrome.windows.onFocusChanged.addListener(windowFocusListener);
                    // }, 300);
                }

                /* remember dimensions on window resize 
                [onBoundsChanged is not supported in Firefox]
                {@link https://bugzilla.mozilla.org/show_bug.cgi?id=1762975}
                */
                if (chrome.windows.onBoundsChanged && (configs.rememberWindowResize || configs.moveToMainWindowOnMaximize)) {
                    function resizeListener(w){
                        if (configs.debugMode) console.log('Popup window resized: ', w);

                        if (w.state == 'maximized'){
                            /// Move to main window on popup maximize
                            if (configs.moveToMainWindowOnMaximize) 
                                chrome.tabs.query({windowId: w.id}, (tabs) => {
                                    if (tabs && tabs.length > 0) {
                                        const tab = tabs[0];
                                        if (tab.id && tab.id > -1) 
                                            moveTabToRegularWindow(tab);
                                        
                                    }
                                });
                        } else {
                            /// Save new popup window size
                            if (configs.rememberWindowResize){
                                if (configs.popupHeight == w.height && configs.popupWidth == w.width) return;
                                if (isViewer && configs.tryFitWindowSizeToImage) return; /// don't save size for automatically resized image viewer
                                configs.popupHeight = w.height;
                                configs.popupWidth = w.width;
                                chrome.storage.sync.set(configs);
                                if (configs.debugMode) console.log('Popup window size saved: ', w.height, w.width);
                            }
                        }

                    }
                    function removedListener(wId){
                        if (wId && wId > -1 && wId == popupWindow.id) {
                            chrome.windows.onBoundsChanged.removeListener(resizeListener);
                            chrome.windows.onRemoved.removeListener(removedListener);
                        }
                    }
                    chrome.windows.onBoundsChanged.addListener(resizeListener);
                    chrome.windows.onRemoved.addListener(removedListener);
                }

                /// clear variables
                elementHeight = undefined; elementWidth = undefined;
                mouseX = undefined; mouseY = undefined;
                textSelection = undefined;
                lastPopupId = popupWindow.id;
            });
        // }, originalWindowIsFullscreen ? 600 : 0)
    }
    if (cfg) {
        /// Use cached configs
        callback();
    } else {
        loadUserConfigs(callback);
    }
 }

 function moveTabToRegularWindow(tab){
    // chrome.tabs.remove(tab.id);
    // chrome.tabs.create({ url: clickData.pageUrl, active: true });

    /// getLastFocused only works in Chrome
    // chrome.windows.getLastFocused(
    //     { populate: false, windowTypes: ['normal'] }).then(function (windowInfo) {
    //     if (windowInfo && windowInfo.id) {
    //         chrome.tabs.move(tab.id, { 
    //             index: -1, 
    //             windowId: windowInfo.id
    //         }, function(t){
    //             chrome.tabs.update(tab.id, { 'active': true });
    //         });
    //     }
    // });

    chrome.windows.getAll(
        { windowTypes: ['normal'] },
        function(windows){

            /// Find last used normal window
            let lastUsedWindowId;
            for (let i = 0, l = windows.length; i < l; i++) {
                const w = windows[i];
                if (w.id && w.id == lastNormalWindowId) {
                    lastUsedWindowId = w.id;
                    break;
                }
            }

            chrome.tabs.move(tab.id, { 
                    index: -1, 
                    windowId: lastUsedWindowId ?? windows[0].id
            }, function(t){
                // if (t && t[0]) chrome.tabs.update(t[0].id, { 'active': true });
                chrome.tabs.update(tab.id, { 'active': true });
            });
        }
    );
}

/// Reopen new single tab windows as popups
chrome.windows.onCreated.addListener(
    (w) => {
        loadUserConfigs((c) => {
            if (configs.reopenSingleTabWindowAsPopup && w.type == 'normal')
                    chrome.tabs.query({windowId: w.id}, (tabs) => {
                        if (tabs.length == 1){
                            const tab = tabs[0];
                            if (isNewTabUrl(tab.url) || isNewTabUrl(tab.pendingUrl)) return;
                            openPopupWindowForLink(undefined, false, false, tab.id, false, c, true);  
                        } 
                    })
        })   
    }
)

/// Reopen tabs that were opened by other tabs
chrome.tabs.onCreated.addListener(newTab => {
    const openerId = newTab.openerTabId;
    if (openerId){
        loadUserConfigs((c) => {
            if (configs.reopenAutoCreatedTabAsPopup)
                /// fetch newly opened tab again, because it may not be ready yet
                chrome.tabs.get(newTab.id, newTab => {
                    
                    if (!newTab.active) return;
                    const newTabUrl = newTab.url || newTab.pendingUrl;
                    if (isNewTabUrl(newTabUrl)) return;

                    chrome.tabs.get(openerId, openerTab => {
                        if (openerTab) {
                            if (!configs.reopenAutoCreatedTabsOnlyPinned || openerTab.pinned) {
                                // chrome.tabs.remove(newTab.id);
                                // moveTabToPopupWindow(newTab);
                                openPopupWindowForLink(newTab.url, false, false, newTab.id, false, c, true);
                            } 
                        }
                    });
                });
        }) 
    }
});

function isNewTabUrl(url) {
    return url == 'about:newtab' || url == 'about:home' || url == 'about:privatebrowsing' ||
        url == 'chrome://newtab/' || url == 'edge://newtab/';
}

chrome.commands.onCommand.addListener((command, senderTab) => {
    if (command === "open-popup-in-main-window") {
        moveTabToRegularWindow(senderTab)
    } else if (command === "open-in-popup-window") {
        openPopupWindowForLink(senderTab.url, false, false, undefined, true);
    } else if (command === "open-search-in-popup-window") {
        openSearchPopup(senderTab);
    }
});

function openSearchPopup(senderTab){
    chrome.tabs.sendMessage(senderTab.id, { command: "get_selected_text" }, response => {
        if (response) {
            const selectedText = decodeURIComponent(response);
            searchSelectedText(selectedText);
        } else {
            searchSelectedText('');
        }
    });

    function searchSelectedText(selectedText) {
        loadUserConfigs((c) => {
            const link = configs.popupSearchUrl.replace('%s', selectedText);
            openPopupWindowForLink(link);
        });
    }
}

/// Set toolbar icon click action
loadUserConfigs((c) => {
    setToolbarIconClickAction();
});

function setToolbarIconClickAction(){
    switch(configs.toolbarIconClickAction){
        case 'openPageInPopupWindow': {
            chrome.action.setPopup({ popup: "" });
            chrome.action.setTitle({ title: chrome.i18n.getMessage('openPageInPopupWindow') });
        } break;
        case 'searchInPopupWindow': {
            chrome.action.setPopup({ popup: "" });
            chrome.action.setTitle({ title: chrome.i18n.getMessage('searchInPopupWindow') });
        } break;
        default: {chrome.i18n.getMessage('searchInPopupWindow')
            chrome.action.setPopup({ popup: "options/options.html" });
            chrome.action.setTitle({ title: chrome.i18n.getMessage('showExtensionSettings') + ' (Open in Popup Window)' });
        }
    }
}

chrome.action.onClicked.addListener(function (senderTab) {
    loadUserConfigs((c) => {
        switch(configs.toolbarIconClickAction){
            case 'openPageInPopupWindow': {
                openPopupWindowForLink(senderTab.url, false, false, undefined, true);
            } break;
            case 'searchInPopupWindow': {
                openSearchPopup(senderTab);
            } break;
            default: return;
        }
    });
});