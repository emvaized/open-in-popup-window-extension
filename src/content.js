document.addEventListener("contextmenu",(e=>onTrigger(e,'context')));
chrome.storage.onChanged.addListener((c) => {
    applyUserConfigs(c, undefined, () => setMouseListeners());
});

loadUserConfigs(function(c) {
    setMouseListeners();
    if (configs.showOpenInTabButton) setupOpenInTabButton();

    /// Cache screen size for the background script
    const { width: screenWidth, height: screenHeight, availLeft } = window.screen;

    if (configs.screenWidth !== screenWidth || configs.availLeft !== availLeft) {
        configs.screenWidth = screenWidth;
        configs.screenHeight = screenHeight;
        configs.availLeft = availLeft;
        chrome.storage.sync.set({
            screenWidth: screenWidth,
            screenHeight: screenHeight,
            availLeft: availLeft,
        });
    }
})

function setMouseListeners(){
    /* Drag listeners */
    if (configs.openByDragAndDrop){
        document.addEventListener("dragstart",dragStartListener);
        document.addEventListener("dragend",dragEndListener);
    } else {
        document.removeEventListener("dragstart",dragStartListener);
        document.removeEventListener("dragend",dragEndListener);
    }

    /* Mod+Click */
    if (configs.openByModClick){
        document.addEventListener("click",onClickListener);
    } else {
        document.removeEventListener("click",onClickListener);
    }

    /* Escape key to close popup */
    if (configs.escKeyClosesPopup){
        document.addEventListener('keyup', EscKeyUpListener)
    } else {
        document.removeEventListener('keyup', EscKeyUpListener)
    }

    /* Double modifier key press to open in popup */
    if (configs.openByModClick && configs.doubleModifierKeyPressTrigger){
        document.addEventListener('keyup', doubleModKeyUpListener);
        document.addEventListener('mouseover', mouseOverListener, { passive: true });
    } else {
        document.removeEventListener('keyup', doubleModKeyUpListener);
        document.removeEventListener('mouseover', mouseOverListener, { passive: true });
    }

    /* Hold click */
    if (configs.openByLongClick){
        document.documentElement.style.setProperty('--hold-click-delay', `${configs.holdClickDelay}ms`);
        document.addEventListener('mousedown', longClickMouseDownListener);
        document.addEventListener('mouseup', longClickMouseUpListener);
        document.addEventListener('selectstart', longClickMouseUpListener); /// Cancel hold if user starts selecting text
        document.addEventListener('dragstart', longClickMouseUpListener); /// Cancel hold if user starts selecting text
    } else {
        document.removeEventListener('mousedown', longClickMouseDownListener);
        document.removeEventListener('mouseup', longClickMouseUpListener);
        document.removeEventListener('selectstart', longClickMouseUpListener);
        document.removeEventListener('dragstart', longClickMouseUpListener);
    }

    /* Dim page overlay */
    if (configs.dimPageOnPopupOpen){
        document.documentElement.style.setProperty('--oip-dim-overlay-bg', `rgba(0, 0, 0, ${configs.dimPageAmount ?? 0.4})`);
    }
}

/* Hold click */
let holdTimeout, holdStartTimeout, holdIndicator;

function longClickMouseDownListener(e) {
    if (e.button != configs.longClickButton) return;
    if (!elementIsValid(e.target)) return;
    if (e.target.id == 'oipImageViewer' || e.target.id == 'gifCanvas') return; /// Avoid conflict with viewer's own hold-to-zoom feature

    holdStartTimeout = setTimeout(function(){
        const x = e.clientX, y = e.clientY;
        removeHoldIndicator();
        if (!holdIndicator){
            holdIndicator = document.createElement('div');
            holdIndicator.className = 'long-click-indicator';
        }
        holdIndicator.style.left = `${x}px`;
        holdIndicator.style.top = `${y + 15}px`;
        document.body.appendChild(holdIndicator);

        holdTimeout = setTimeout(function(){
            removeHoldIndicator();
            e.preventDefault();
            e.stopPropagation();
            preventClick(e.target); /// Prevent triggering click event after mouseup
            onTrigger(e, 'modClick');
        }, configs.holdClickDelay);
    }, 100); /// Short delay to prevent trigger when user is clicking normally
}
function longClickMouseUpListener(e) {
    clearTimeout(holdStartTimeout);
    clearTimeout(holdTimeout);
    removeHoldIndicator();
}
function removeHoldIndicator(){
    if (holdIndicator) holdIndicator.remove();
}
function preventClick(element, duration = 600) {
    element.classList.add('oip-prevent-click');
    setTimeout(() => element.classList.remove('oip-prevent-click'), duration);
}

/* Change drag cursor and trigger popup on drag end */
let dragStartDx, dragStartDy;

function dragStartListener(e){
    if (!elementIsValid(e.target, true)) return;
    dragStartDx = e.clientX; dragStartDy = e.clientY;
    document.addEventListener('dragover', dragOverListener, true);
    document.addEventListener('dragenter', dragOverListener, true);
}
function dragEndListener(e){
    if ((e.dataTransfer.dropEffect == 'none' || e.dataTransfer.dropEffect == 'link') && e.clientX <= document.documentElement.clientWidth) {
        if (e.dataTransfer.mozUserCancelled) return; /// use Esc key to cancel drag on Firefox
        if (
            Math.abs(e.clientX - dragStartDx) > configs.minimalDragDistance ||
            Math.abs(e.clientY - dragStartDy) > configs.minimalDragDistance
        ) onTrigger(e, 'drag')
    }
    document.removeEventListener('dragover', dragOverListener, true);
    document.removeEventListener('dragenter', dragOverListener, true);
}
function dragOverListener(e){
    if (!configs.changeDragCursor) return;
    
    if (!shouldOverrideDragCursor(e.target)){
        e.dataTransfer.dropEffect = '';
        return;
    }

    const hasMoved = Math.max(Math.abs(e.clientX - dragStartDx),  Math.abs(e.clientY - dragStartDy)) > configs.minimalDragDistance;
    e.preventDefault();
    e.dataTransfer.dropEffect = hasMoved ? 'link' : 'none';
}
function shouldOverrideDragCursor(target) {
    /// Reject interactive elements
    if (!(target instanceof Element)) return true;
    const interactiveSelector = 'input, textarea, select, button, label, [contenteditable], [ondrop], .custom-drop-target';
    return !target.closest(interactiveSelector);
}

/* Escape key to close popup */
function EscKeyUpListener(e){
    if (e.key == 'Escape'){
         chrome.runtime.sendMessage({action: 'requestEscPopupWindowClose'})
    }
}

/* Double modifier key press to open in popup */
let doublePressDelay = 300, lastKeypressTime = 0;

function doubleModKeyUpListener(e){
    if (e.key.toLowerCase() === configs.modifierKey && lastMouseOverData.target) {
        const currentTime = Date.now();
        if (currentTime - lastKeypressTime < doublePressDelay) {
            if (!elementIsValid(lastMouseOverData.target, true)) return;
            // lastMouseOverData.target.focus(); /// shows the focus ring to indicate which element will be opened
            onTrigger(undefined, 'modClick');
            return;
        }
        lastKeypressTime = currentTime;
    }
}

const lastMouseOverData = {target: null, x: 0, y: 0 }
function mouseOverListener(e){
    lastMouseOverData.target = e.target;
    lastMouseOverData.x = e.screenX;
    lastMouseOverData.y = e.screenY;
}

/* Mod+Click to open in popup */
function onClickListener(e){
    let modPressed = false;
    switch (configs.modifierKey) {
        case 'shift': modPressed = e.shiftKey; break;
        case 'control': modPressed = e.ctrlKey; break;
        case 'alt': modPressed = e.altKey; break;
        case 'meta': modPressed = e.metaKey; break;
    }
    if (modPressed && elementIsValid(e.target)){
        e.preventDefault();
        onTrigger(e, 'modClick');
    }
}

/* Common trigger callback */
function onTrigger(e, type){
    const t = e ? e.target : lastMouseOverData.target;
    const selectedText = getSelectedText();

    const { availLeft, availHeight, availWidth } = window.screen;
    const message = {
        mouseX: e ? e.screenX : lastMouseOverData.x, mouseY: e ? e.screenY : lastMouseOverData.y,
        elementHeight: t.naturalHeight ?? t.clientHeight > 0 ? t.clientHeight : t.offsetHeight,
        elementWidth: t.naturalWidth ?? t.clientWidth > 0 ? t.clientWidth : t.offsetWidth,
        availHeight: availHeight, availWidth: availWidth,
        selectedText: selectedText,
        availLeft: availLeft, type: type
    }

    let link, isViewer = false;
    if (type == 'drag' || type == 'modClick') {
        const imgElement = t.closest && t.closest("img");
        const linkElement = t.closest && t.closest("a");

        if (imgElement && linkElement) {
            /// Image wrapped in link
            if (configs.imageWithLinkPreferLink){
                nodeName = linkElement.nodeName;
                link = linkElement.href;
            } else {
                nodeName = imgElement.nodeName;
                link = imgElement.currentSrc || imgElement.src;
                isViewer = true;
            }
        } else if (imgElement){
            /// Image
            nodeName = imgElement.nodeName;
            link = imgElement.currentSrc || imgElement.src;
            isViewer = true;

            if (configs.lookUpHighResImages){
                const hiResLink = getHiResImg(t);
                if (hiResLink) link = hiResLink;
            }
        } else if (linkElement){
            /// Link
            nodeName = linkElement.nodeName;
            link = linkElement.href;
        }
    
        if (!link && !selectedText) return;

        message['isViewer'] = isViewer;
        message['link'] = link;
    }

    chrome.runtime.sendMessage(message)
}

/* Check if element under cursor is an image or a link */
const elementIsValid = (el, shouldCheckSelection = false) => { 
    return (el.closest && el.closest('a, img')) || (shouldCheckSelection && elementWithinSelection(el));
};

const elementWithinSelection = (el) => {
    const selection = window.getSelection();
    const isSelectedText = selection && 
    selection.toString().trim() !== '' && 
    selection.containsNode(el, true);  /// true = allow partial containment
    return isSelectedText;
}

/* Apply dim effect to page on popup open */
let dimOverlay;
const dimAnimDuration = 200;

function dimPage(){
    if (!configs.dimPageOnPopupOpen) return;

    if (dimOverlay) dimOverlay.remove();
    dimOverlay = document.createElement('div');
    dimOverlay.id = 'oip-dim-overlay';
    dimOverlay.style.animation = `fadeIn ${dimAnimDuration}ms ease-in forwards`;
    document.body.appendChild(dimOverlay);

    setTimeout(() => window.addEventListener('focus', undimPage),100);
}
function undimPage(){
    if (dimOverlay && dimOverlay.isConnected) {
        dimOverlay.style.opacity = 1;
        dimOverlay.style.animation = `fadeOut ${dimAnimDuration}ms ease-out forwards`;
        setTimeout(() => dimOverlay.remove(), dimAnimDuration);
    }
    window.removeEventListener('focus', undimPage)
}

/* "Split view" and "Open in tab" buttons for popup windows and "Back to popup" button for tabs that came from popup:
appear when mouse is near the top edge of the window */
let openInTabButtonHost, openInTabButtonListeners;

function removeOpenInTabButton(){
    if (openInTabButtonListeners) openInTabButtonListeners.abort();
    if (openInTabButtonHost) openInTabButtonHost.remove();
    openInTabButtonHost = openInTabButtonListeners = null;
}

const popupButtonIcons = {
    openPopupInMainWindow: '<path d="M4.5 1.5h6v6M10.5 1.5 4 8M8.5 7v3.5h-7v-7H5"/>',
    splitPopupWithOriginTab: '<rect x="1" y="2" width="10" height="8" rx="1.5"/><path d="M6 2v8"/>',
    returnTabToPopup: '<path d="M7.5 10.5h-6v-6M1.5 10.5 8 4M3.5 5V1.5h7v7H7"/>'
};

/// Shows the buttons that fit where the page is now, removes them otherwise (tab can be moved between windows)
function setupOpenInTabButton(){
    if (window.top !== window) return;
    chrome.runtime.sendMessage({ action: 'isPopupWindow' }).then((response) => {
        removeOpenInTabButton();
        if (!response) return;

        const buttons = [];
        if (response.isPopup && response.canSplit) buttons.push(['splitPopupWithOriginTab', chrome.i18n.getMessage('splitViewButton') || 'Split view']);
        if (response.isPopup) buttons.push(['openPopupInMainWindow', chrome.i18n.getMessage('openInTabButton') || 'Open in tab']);
        else if (response.cameFromPopup) buttons.push(['returnTabToPopup', chrome.i18n.getMessage('returnToPopupButton') || 'Back to popup']);
        if (!buttons.length) return;

        const host = openInTabButtonHost = document.createElement('div');
        host.id = 'oip-open-in-tab';
        const shadow = host.attachShadow({ mode: 'closed' });
        shadow.innerHTML = `
            <style>
                .bar {
                    position: fixed; bottom:0px; right:0px; z-index: 2147483647;
                    display: flex; gap: 2px;
                    opacity: 0; transition: opacity 200ms ease;
                    border-top: 1px solid gray; border-left: 1px solid gray;
                    background: Background; border-radius: 6px 0 0;
                    font-family: sans-serif; font-size: 13px;
                }
                .bar.visible { opacity: 1;}
                .bar.visible button { pointer-events: auto; }
                button {
                    position: relative; display: flex; align-items: center;
                    padding: 4px; border: 0; border-radius: 3px;
                    background: transparent;
                    cursor: pointer; pointer-events: none; user-select: none;
                }
                /* larger invisible hit area, so clicks near the rounded edges are not lost */
                button:hover { background: AccentColor; }
                svg { width: 15px; height: 15px; }
                .url{
                    padding: 4px 2px;
                    margin-left:2px;
                    opacity: 0.65;
                    color: inherit;
                    border-right: 1px solid grey;
                }
            </style>
            <div class="wrapper"><span class="url"></span><div class="bar"></div></div>`;
        const bar = shadow.querySelector('.bar');

        /// Show url on the bar
        const urlLabel = document.createElement('span');
        urlLabel.className = 'url';
        setUrlLabel();
        bar.appendChild(urlLabel);
        window.navigation.addEventListener("navigate", ()=>setUrlLabel());

        function setUrlLabel(){
            const url = decodeURI(window.location.href.replace('https://','')), maxLength = 35;
            urlLabel.textContent = url.length > maxLength ? url.substring(0,maxLength) + '...' : url;
            urlLabel.title = url;
        }

        /// Add buttons
        for (const [action, label] of buttons) {
            const button = document.createElement('button');
            button.type = 'button';
            button.innerHTML = `<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6">${popupButtonIcons[action] ?? ''}</svg><span></span>`;
            button.title = label;
            /// Act on press: in Firefox "click" is lost if the pointer moves slightly between press and release
            button.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                chrome.runtime.sendMessage({ action: action });
            });
            bar.appendChild(button);
        }

        /// Attach to the document
        document.documentElement.appendChild(host);
        const setVisible = (visible) => bar.classList.toggle('visible', visible && !document.fullscreenElement);

        /// Show briefly, so the user knows the buttons exist
        setTimeout(()=>setVisible(true), 10);
    }).catch(() => {});
}

/* Looks for hight-res image source in srcset or data attributes */
const getHiResImg = (img) => {
  const parseSrcset = (str) => {
    if (!str) return null;
    return str.split(',')
      .map(s => {
        const [url, desc] = s.trim().split(/\s+/);
        return { url, val: parseFloat(desc) || 0 };
      })
      .sort((a, b) => b.val - a.val)[0]?.url;
  };

  /// Check <source> tags and <img> attributes
  const pictureSources = Array.from(img.closest('picture')?.querySelectorAll('source') || []);
  const rawUrl = 
    parseSrcset(img.getAttribute('srcset') || img.getAttribute('data-srcset')) ||
    pictureSources.map(s => parseSrcset(s.getAttribute('srcset') || s.getAttribute('data-srcset'))).find(u => u) ||
    img.getAttribute(img.getAttributeNames().find(a => /data-(src|orig|full|hi|lazy|large|img)/i.test(a))) ||
    img.src;

  /// Resolve the URL to be absolute (Fixes // and relative paths)
  let url = new URL(rawUrl, window.location.href).href;

  /// 3. Strip query params and thumbnail suffixes
  return url
    .replace(/([?&])(w|width|h|height|size|resize|fit|quality|q|scale)=\d+/gi, '$1')
    .replace(/[-_]\d+x\d+(?=\.[a-z]+(\?|$))/i, '')
    .replace(/[?&]$|([?&])&+/g, '$1') /// Clean up trailing ?/& or double &&
    .replace(/[?&]$/, '');
};

/* Extract selected text from page */
const getSelectedText = () => {
    let selectedText = window.getSelection().toString().trim();
    selectedText = selectedText.replace(/\r?\n|\r/g, '');
    return encodeURIComponent(selectedText);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    /// Dim page on popup open
    if (message.action == 'windowTypeChanged') {
        if (configs.showOpenInTabButton) setupOpenInTabButton();
        return;
    }
    if (message.action == 'dimPage') {
        dimPage();
        return;
    }
    /// For 'search in popup' keyboard hotkey and toolbar injection
    if (message.command == 'get_selected_text') {
        const selectedText = getSelectedText(); /// Remove line breaks
        return sendResponse(selectedText);
    }
});