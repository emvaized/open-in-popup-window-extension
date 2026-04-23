let mouseX, mouseY, elementHeight, elementWidth, lastPopupId, lastNormalWindowId;
let textSelection, availWidth, availHeight, availLeft;
let preventWindowResizeListener = false;
let preventNewTabListeners = false;

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
            }, ['escKeyClosesPopup']);
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

                    const titleBarHeight = request.titleBarHeight ?? 32;
                    const toolbarWidth = request.toolbarWidth ?? 0;
                    const contentHeight = Math.max(0, w.height - titleBarHeight);
                    let newWidth = Math.round(contentHeight * request.aspectRatio + toolbarWidth);
                    let newHeight = w.height;

                    if (newWidth > availWidth) {
                        newWidth = Math.round(availWidth * 0.7);
                        const newContentWidth = Math.max(0, newWidth - toolbarWidth);
                        const newContentHeight = Math.round(newContentWidth / request.aspectRatio);
                        newHeight = newContentHeight + titleBarHeight;
                    }

                    let dx = w.left;
                    let dy = w.top;
                    dx -= Math.round((newWidth - w.width) / 2);
                    dy -= Math.round((newHeight - w.height) / 2);

                    if (dx + newWidth > availWidth)
                        dx -= (dx + newWidth - availWidth);
                    if (dx < 0) dx = 0;
                    if (dy + newHeight > availHeight) 
                        dy -= (dy + newHeight - availHeight);
                    if (dy < 0) dy = 0;

                    preventWindowResizeListener = true;
                    chrome.windows.update(lastPopupId, {
                        'width': newWidth,
                        'height': newHeight,
                        'left': dx,
                        'top': dy
                    }, () => preventWindowResizeListener = false);
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

        if (request.type == 'drag' || request.type == 'modClick') {
            loadUserConfigs((cfg) => {
                // if (request.type == 'drag' && configs.openByDragAndDrop == false) return;
                // if (request.type == 'modClick' && configs.openByModClick == false) return;

                const isViewer = request.isViewer ?? false;
                if (isViewer && !cfg.viewInPopupEnabled) return;
                openPopupWindowForLink(request.link, isViewer, request.type == 'drag', false, false, cfg, false, sender.tab ? sender.tab : undefined); 
            });
        }
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

/// Draft for "Open tab in popup window" in Firefox
// if (navigator.userAgent.indexOf("Firefox") > -1){
//     const openTabInPopupWindow = {
//         "id": "openTabInPopupWindow",
//         "title": chrome.i18n.getMessage('openPageInPopupWindow'),
//         "contexts": ["tab"]
//     } 
//     chrome.contextMenus.create(openTabInPopupWindow);
// }

chrome.windows.onFocusChanged.addListener(function(wId){
        if (wId == undefined || wId < 0) return; /// don't process when window lost focus
        chrome.windows.get(wId, {},
            (w) => { 
                // if (chrome.runtime.lastError || !w) {
                //     if (configs.debugMode) console.log('Error fetching focused window:', chrome.runtime.lastError.message);
                //     return;
                // }
                if (!w) return;
                if (configs.debugMode) console.log('Focused window', wId);

                /// Update context menu availability
                chrome.contextMenus.update(
                    "openInMainWindow", 
                    {
                        "visible": w.type == 'popup', 
                        "contexts": w.type == 'popup' ? ["page"] : ["page_action"] 
                    });

                loadUserConfigs((c) => {
                    chrome.contextMenus.update(
                        "openPageInPopupWindow", 
                        {
                            "visible": w.type !== 'popup' && configs.addOptionOpenPageInPopupWindow, 
                            "contexts": w.type == 'popup' ? ["page_action"] : ["page"]
                        });

                    if (w.type == 'normal') lastNormalWindowId = wId;
                        else return;  /// filter out popup windows

                    /// Close popup on focus regular window
                    if (configs.closeWhenFocusedInitialWindow)
                        getPopupWindows((popupWindows) => {
                            if (popupWindows.has(wId)) return; 

                            if (configs.debugMode){
                                console.log('Focused normal window with ID: ', wId);
                                console.log(`Opened popup windows for closing: (${popupWindows.size})`, popupWindows);
                            }

                            for (const [popupId, popupData] of popupWindows) {
                                if (popupData.isCurrentPage && configs.keepOpenPageInPopupWindowOpen) continue;

                                chrome.windows.get(popupId, {}, (pW) => {
                                    if (chrome.runtime.lastError || !pW) {
                                        removePopupId(popupId, popupWindows);
                                        return;
                                    }

                                    if (pW.state === 'minimized' || pW.alwaysOnTop) return;

                                    chrome.windows.remove(popupId, () => {
                                        if (chrome.runtime.lastError) {
                                            console.warn('Popup already closed:', chrome.runtime.lastError.message);
                                        }
                                        removePopupId(popupId, popupWindows);
                                    });
                                });
                            }
                        });
                }, ['addOptionOpenPageInPopupWindow', 'closeWhenFocusedInitialWindow', 'keepOpenPageInPopupWindowOpen']);
                
            },
        );
    }
); 

chrome.contextMenus.onClicked.addListener(function(clickData, tab) {
    if (clickData.menuItemId == 'openInMainWindow') {
        let shouldFocusTab = true;
        if (clickData.button && clickData.button == 1) shouldFocusTab = false; /// if middle mouse button was used, don't focus the tab
        if (clickData.modifiers && (clickData.modifiers.includes('Ctrl') || clickData.modifiers.includes('Shift'))) shouldFocusTab = false;
        if (tab) moveTabToRegularWindow(tab, shouldFocusTab);
        return;
    }
    
    if (clickData.menuItemId == 'openPageInPopupWindow' || clickData.menuItemId == 'openTabInPopupWindow') {
        if (tab)
            loadUserConfigs((c) => {
                openPopupWindowForLink(clickData.pageUrl, false, false, configs.copyTabInsteadOfMoving ? undefined : tab.id, true, c);
            });
        return;
    }

    const link = clickData.menuItemId == 'searchInPopupWindow' ? 
        configs.popupSearchUrl.replace('%s', clickData.selectionText) 
        : clickData.menuItemId == 'viewInPopupWindow' ? clickData.srcUrl : clickData.linkUrl;
    openPopupWindowForLink(link, clickData.menuItemId == 'viewInPopupWindow', undefined, undefined, undefined, undefined, false, tab ? tab : undefined);
 });

function openPopupWindowForLink(link, isViewer = false, isDragEvent, tabIdToCopy, isCurrentPage = false, cfg, forceFallbackLocation = false, senderTab) {
    loadUserConfigs(function(){
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
        if (!availLeft) availLeft = configs.availLeft ?? 0;
        if (!availWidth) availWidth = configs.screenWidth;
        if (!availHeight) availHeight = configs.screenHeight;

        function setFallbackPopupLocation(){
            setPopupLocation(configs.fallbackPopupWindowLocation ?? 'center');
        }

        function setPopupLocation(preference){
            switch(preference){
                case 'mousePosition': {
                    /// open at last known mouse position
                    if (mouseX && mouseY){
                        dx = mouseX - (width / 2), dy = mouseY - (height / 2);
                    } else {
                        /// if no dx stored, switch to fallback
                        setFallbackPopupLocation();
                    }
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
                    dx = availWidth ? (availLeft + availWidth / 2) : availLeft;
                    dx -= width / 2;
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
                    dx = availWidth ? availLeft + availWidth / 2 : availLeft;
                    dy = availHeight ? availHeight / 2 : 0;
                    dx -= width / 2;
                    dy -= height / 2;
                } break;
            }
        }

        if (forceFallbackLocation && (configs.popupWindowLocation == 'mousePosition' || configs.popupWindowLocation == 'nearMousePosition')) {
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
            console.log('Calculated popup window dy: ', dy);
            console.log('Checking for screen overflow...');
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
        }
        
        /// create popup window
        // setTimeout(function () {
            const createParams = {
                'type': 'popup', 
                'width': width, 'height': height, 
                'top': dy, 'left': dx
            };

            if (tabIdToCopy) {
                createParams.tabId = tabIdToCopy;
            } else {
                createParams['url'] = isViewer ? 
                    (configs.useBuiltInImageViewer ? link :
                        chrome.runtime.getURL('viewer/viewer.html') + '?src=' + link) 
                    : link ?? (textSelection ? 
                        (configs.popupSearchUrl.replace('%s', textSelection))
                        : 'about:blank');
            }

            /// Preserve Firefox container
            if (senderTab && senderTab.cookieStoreId) {
                createParams['cookieStoreId'] = senderTab.cookieStoreId;
            }

            preventNewTabListeners = true;
            chrome.windows.create(createParams, function (popupWindow) {
                if (chrome.runtime.lastError || !popupWindow) {
                    if (configs.debugMode) console.warn('Failed to create popup window:', chrome.runtime.lastError.message);
                    return;
                }

                let popupWindowId = popupWindow.id;

                if (configs.debugMode){
                    console.log('Created popup window:', popupWindow);
                    console.log('End logging ~~~');
                }

                /// set coordinates again (workaround for old firefox bug)
                if (popupWindow.left !== dx)
                    chrome.windows.update(popupWindowId, {
                        'top': dy, 'left': dx, 'width': width, 'height': height
                    });

                /// Dim page for main window
                if (configs.dimPageOnPopupOpen && senderTab && senderTab.id && !isCurrentPage) {
                    chrome.tabs.sendMessage(senderTab.id, { action: 'dimPage' });
                }

                /* remember dimensions on window resize 
                [onBoundsChanged is not supported in Firefox]
                {@link https://bugzilla.mozilla.org/show_bug.cgi?id=1762975}
                */
                if (chrome.windows.onBoundsChanged && (configs.rememberWindowResize || configs.moveToMainWindowOnMaximize)) {
                    function resizeListener(w){
                        if (configs.debugMode) console.log('Popup window moved/resized: ', w);
                        if (preventWindowResizeListener) return;
                        if (w.type !== 'popup') return;

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
                                if (isViewer && configs.tryFitWindowSizeToImage) return; /// don't save size for automatically resized image viewer
                                if (Math.abs(w.height - configs.popupHeight) <= 2 && Math.abs(w.width - configs.popupWidth) <= 2) return;
                                configs.popupHeight = w.height;
                                configs.popupWidth = w.width;
                                chrome.storage.sync.set(configs);
                                if (configs.debugMode) console.log('New popup window size saved: ', w.height, 'x', w.width);
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

                /// TODO:
                /// If the popup is going to open in the same place as the last one, try to move it a bit to prevent covering previous one
                /// Can use the new popups persistence logic
                // if (lastPopupId)
                //     chrome.windows.get(lastPopupId,{}, (w) => {
                //         if (!w) return;
                //         let lastPopupDx = w.left, lastPopupDy = w.top, lastPopupWidth = w.width, lastPopupHeight = w.height;
                //         if (lastPopupDx && lastPopupDy && lastPopupWidth && lastPopupHeight &&
                //         Math.abs(dx - lastPopupDx) < 5 && Math.abs(dy - lastPopupDy) < 5 &&
                //         Math.abs(width - lastPopupWidth) < 5 && Math.abs(height - lastPopupHeight) < 5) {
                //             dy = lastPopupDy + (configs.titleBarHeight ?? 30);
                //             height = lastPopupHeight - (configs.titleBarHeight ?? 30);

                //             preventWindowResizeListener = true;
                //             chrome.windows.update(popupWindow.id, { top: dy, height: height }, ()=> preventWindowResizeListener = false);
                //         }
                //     });

                /// Clear variables
                elementHeight = undefined; elementWidth = undefined;
                mouseX = undefined; mouseY = undefined;
                textSelection = undefined;
                preventNewTabListeners = false;

                /// Store new popup
                lastPopupId = popupWindow.id;
                addPopupWindow(popupWindow.id, { isCurrentPage: isCurrentPage })
            });
        // }, originalWindowIsFullscreen ? 600 : 0)
    })
}


/// Popups persistence
let openedPopupWindows;  /// cached Map<id, {type, ...}>

function getPopupWindows(callback) {
    if (openedPopupWindows) {
        callback(openedPopupWindows);
    } else {
        chrome.storage.session.get('openedPopupWindows', (result) => {
            openedPopupWindows = new Map(result.openedPopupWindows ?? []);
            callback(openedPopupWindows);
        });
    }
}
const addPopupWindow = (id, data) => getPopupWindows((popups) => { popups.set(id, data ?? {}); savePopupIds(popups); });
const removePopupId = (id, popups) => { popups.delete(id); savePopupIds(popups); }
const savePopupIds = (popups) => chrome.storage.session.set({ 'openedPopupWindows': [...popups.entries()] });

chrome.windows.onRemoved.addListener((wId) => {
    getPopupWindows((popups) => removePopupId(wId, popups));
});

/// Reopen new single tab windows as popups
chrome.windows.onCreated.addListener(
    (w) => {
        if (preventNewTabListeners) return;
        
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
    if (preventNewTabListeners) return;

    if (newTab.openerTabId){
        loadUserConfigs((cfg) => {
            if (cfg.reopenAutoCreatedTabAsPopup)
                Promise.all([
                    chrome.tabs.get(newTab.id),
                    chrome.tabs.get(newTab.openerTabId),
                ])
                .then((tabs) => {
                    let newTab = tabs[0], openerTab = tabs[1];
                    if (!newTab || !openerTab) return;

                    if (!cfg.reopenAutoCreatedTabsOnlyPinned || openerTab.pinned) {
                        if (!newTab.active) return;
                        const newTabUrl = newTab.url || newTab.pendingUrl;
                        if (isNewTabUrl(newTabUrl)) return;

                        openPopupWindowForLink(newTab.url, false, false, newTab.id, false, undefined, true, openerTab);
                    } 
                }).catch((e) => {});
        }, ['reopenAutoCreatedTabAsPopup', 'reopenAutoCreatedTabsOnlyPinned']) 
    }
});

const isNewTabUrl = (url) => url == 'about:newtab' || url == 'about:home' || url == 'about:privatebrowsing' 
    || url == 'chrome://newtab/' || url == 'edge://newtab/' || url.startsWith('chrome://vivaldi-webui/startpage?');

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
            openPopupWindowForLink(link, false, false, undefined, undefined, c, undefined, senderTab);
        });
    }
}

function moveTabToRegularWindow(tab, shouldFocusTab = true){
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

            const targetWindowId = lastUsedWindowId ?? windows[0].id;
            chrome.tabs.move(tab.id, { 
                    index: -1, 
                    windowId: targetWindowId
            }, function(t){
                // if (t && t[0]) chrome.tabs.update(t[0].id, { 'active': true });
                chrome.tabs.update(tab.id, { 'active': shouldFocusTab });
                // chrome.windows.update(targetWindowId, {focused: true});
            });
        }
    );
}

/// Set toolbar icon click action
loadUserConfigs(() => {
    setToolbarIconClickAction();
}, ['toolbarIconClickAction']);

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
                openPopupWindowForLink(senderTab.url, false, false, configs.copyTabInsteadOfMoving ? undefined : senderTab.id, true, c, undefined, senderTab);
            } break;
            case 'searchInPopupWindow': {
                openSearchPopup(senderTab);
            } break;
            default: return;
        }
    });
});