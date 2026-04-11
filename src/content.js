document.addEventListener("contextmenu",(e=>onTrigger(e,'context')));
chrome.storage.onChanged.addListener((c) => {
    // loadUserConfigs((c) => setMouseListeners())
    applyUserConfigs(c, undefined, () => setMouseListeners());
});

loadUserConfigs(function(c) {
    setMouseListeners();

    /// Cache screen size for the background script
    if (configs.screenWidth !== window.screen.width || configs.availLeft !== window.screen.availLeft) {
        configs.screenWidth = window.screen.width;
        configs.screenHeight = window.screen.height;
        configs.availLeft = window.screen.availLeft;
        chrome.storage.sync.set(configs);
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
        document.addEventListener('mouseover', mouseOverListener);
    } else {
        document.removeEventListener('keyup', doubleModKeyUpListener);
        document.removeEventListener('mouseover', mouseOverListener);
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
}

/* Hold click */
let holdTimeout, holdStartTimeout, holdIndicator;

function longClickMouseDownListener(e) {
    if (e.button !== 0) return;
    if (!isValidElement(e.target)) return;
    if (e.target.id == 'oipImageViewer' || e.target.id == 'gifCanvas') return; /// Avoid conflict with viewer's own hold-to-zoom feature

    holdStartTimeout = setTimeout(function(){
        const x = e.clientX, y = e.clientY;
        removeHoldIndicator();
        holdIndicator = document.createElement('div');
        holdIndicator.className = 'long-click-indicator';
        holdIndicator.style.left = `${x}px`;
        holdIndicator.style.top = `${y + 15}px`;
        document.body.appendChild(holdIndicator);
        setTimeout(() => holdIndicator.style.opacity = 1, 1); /// Fade in

        holdTimeout = setTimeout(function(){
            removeHoldIndicator();
            e.preventDefault();
            e.stopPropagation();
            preventClick(); /// Prevent triggering click event after mouseup
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
    if (holdIndicator) {
        holdIndicator.remove();
        holdIndicator = null;
    }
}
function preventClick(duration=100){
    function tempMouseUpListener(e){
        e.preventDefault();
        e.stopPropagation();
        document.removeEventListener('mouseup', tempMouseUpListener);
    }
    document.addEventListener('mouseup', tempMouseUpListener);
    setTimeout(() => document.removeEventListener('mouseup', tempMouseUpListener), duration);
}

/* Change drag cursor and trigger popup on drag end */
let dragStartDx, dragStartDy;

function dragStartListener(e){
    if (!isValidElement(e.target)) return;
    dragStartDx = e.clientX; dragStartDy = e.clientY;
    document.addEventListener('dragover', dragOverListener, true);
    document.addEventListener('dragenter', dragOverListener, true);
}
function dragEndListener(e){
    if (e.dataTransfer.dropEffect == 'none' || e.dataTransfer.dropEffect == 'link') {
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
let lastHoveredElement;

function doubleModKeyUpListener(e){
    if (e.key.toLowerCase() === configs.modifierKey && lastHoveredElement) {
        const currentTime = Date.now();
        if (currentTime - lastKeypressTime < doublePressDelay) {
            if (!isValidElement(lastHoveredElement)) return;
            onTrigger(undefined, 'modClick');
            return;
        }
        lastKeypressTime = currentTime;
    }
}
function mouseOverListener(e){
    lastHoveredElement = e.target;
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
    if (modPressed && isValidElement(e.target)){
        e.preventDefault();
        onTrigger(e, 'modClick');
    }
}

/* Common trigger callback */
function onTrigger(e, type){
    const t = e ? e.target : lastHoveredElement;

    const selectedText = getSelectedText();
    let lastHoveredElementRect;
    if (!e) lastHoveredElementRect = lastHoveredElement.getBoundingClientRect();

    const message = {
        mouseX: e ? e.screenX : lastHoveredElementRect.left, mouseY: e ? e.screenY : lastHoveredElementRect.top,
        elementHeight: t.naturalHeight ?? t.clientHeight > 0 ? t.clientHeight : t.offsetHeight,
        elementWidth: t.naturalWidth ?? t.clientWidth > 0 ? t.clientWidth : t.offsetWidth,
        availHeight: window.screen.availHeight, availWidth: window.screen.availWidth,
        selectedText: selectedText,
        availLeft: window.screen.availLeft, type: type
    }

    let nodeName, link;
    if (type == 'drag' || type == 'modClick') {
        /// Handle IMG wrapped in A
        if (t.parentNode && t.parentNode.nodeName == 'A'){
            if (configs.imageWithLinkPreferLink){
                nodeName = t.parentNode.nodeName;
                link = t.parentNode.href;
            } else {
                nodeName = t.nodeName;
                link = t.src;
            }
        } else if (t.childNodes && t.childNodes.length == 1 && t.firstChild.nodeName == 'IMG') {
            if (configs.imageWithLinkPreferLink){
                nodeName = t.nodeName;
                link = t.href;
            } else {
                nodeName = t.firstChild.nodeName;
                link = t.firstChild.src;
            }
        } else {
            nodeName = t.nodeName;
            link = t.src ?? t.href ?? t.parentNode.href;
        }

        /// Handle IMG with source in sourceset
        if (nodeName == 'IMG' && !link && t.parentNode && t.parentNode.nodeName == 'PICTURE') {
            const src = t.parentNode.querySelector('source');
            if (src) link = src.getAttribute('srcset');
        }

        if (!link) link = t.href || t.src || t.parentNode.href;

        /// Handle links in shadow root
        if (!link && !selectedText) {
            const closestA = t.closest('a');
            if (closestA) link = closestA.href;
        }

        if (!link && !selectedText) return;

        /// Look up for high-res image source
        if (configs.lookUpHighResImages && nodeName == 'IMG') {
            const hiResLink = getHiResImg(t);
            if (hiResLink) link = hiResLink;
        }

        message['nodeName'] = nodeName;
        message['link'] = link;
    }

    chrome.runtime.sendMessage(message)
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

/* Check if element under cursor has a valid src or href, or is an image with source in srcset or picture element */
const isValidElement = (el) => { 
    const selection = window.getSelection();
    const isSelectedText = selection && 
    selection.toString().trim() !== '' && 
    selection.containsNode(el, true);  // true = allow partial containment
    return el.src || el.href || el.parentNode.href || el.srcset || isSelectedText; 
};

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