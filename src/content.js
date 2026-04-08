document.addEventListener("contextmenu",(e=>onTrigger(e,'context')));
chrome.storage.onChanged.addListener((c) => {
    loadUserConfigs((c) => setMouseListeners(), setCssVariables())
});

loadUserConfigs(function(c) {
    setMouseListeners();
    setCssVariables();

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
let holdClickDelay = configs.holdClickDelay || 500; /// Default to 500ms if not set

function setCssVariables(){
    const root = document.documentElement;
    root.style.setProperty('--hold-click-delay', `${holdClickDelay}ms`);
}

function longClickMouseDownListener(e) {
    if (!isValidElement(e.target)) return;
    if (e.target.id == 'oipImageViewer' || e.target.id == 'gifCanvas') return; /// Avoid conflict with viewer's own hold-to-zoom feature

    holdStartTimeout = setTimeout(function(){
        const x = e.clientX, y = e.clientY;

        // Create the ring at cursor position
        // holdIndicator = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        // holdIndicator.setAttribute("class", "long-click-indicator");
        // holdIndicator.setAttribute("width", "40");
        // holdIndicator.setAttribute("height", "40");
        // holdIndicator.style.left = `${x}px`;
        // holdIndicator.style.top = `${y}px`;
        // holdIndicator.innerHTML = `<circle class="long-click-indicator-circle" cx="20" cy="20" r="18"></circle>`;
        // document.body.appendChild(holdIndicator);

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
        }, holdClickDelay);
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
    if (!isValidElement(e.target)) return;

    if (e.key.toLowerCase() === configs.modifierKey && lastHoveredElement) {
        const currentTime = Date.now();
        if (currentTime - lastKeypressTime < doublePressDelay) {
            onTrigger(undefined, 'modClick');
        }
        lastKeypressTime = currentTime;
    }
}

function mouseOverListener(e){
    lastHoveredElement = e.target;
}

/* Mod+Click to open in popup */
function onClickListener(e){
    if (!isValidElement(e.target)) return;

    let modPressed = false;
    switch (configs.modifierKey) {
        case 'shift': modPressed = e.shiftKey; break;
        case 'control': modPressed = e.ctrlKey; break;
        case 'alt': modPressed = e.altKey; break;
        case 'meta': modPressed = e.metaKey; break;
    }
    if (modPressed && (e.target.href || e.target.src || e.target.parentNode.href)){
        e.preventDefault();
        onTrigger(e, 'modClick');
    }
}

/// Check if element under cursor has a valid src or href, or is an image with source in srcset or picture element
// const isValidElement = (el) => el.src ?? el.href ?? el.parentNode.href;
const isValidElement = (el) => { 
    const selection = window.getSelection();
    const isSelectedText = selection && 
    selection.toString().trim() !== '' && 
    selection.containsNode(el, true);  // true = allow partial containment
    return el.src || el.href || el.parentNode.href || el.srcset || isSelectedText; 
};

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

/* Looks for hight-res image source in srcset or data attributes */
const getHiResImg = (img) => {
    const fromSet = (s) => s?.split(',').at(-1).split(' ')[0];

    let url = fromSet(img.closest('picture')?.querySelector('source')?.srcset) || 
            fromSet(img.srcset) || 
            img.getAttribute(img.getAttributeNames().find(a => /^data-(src|orig|full|zoom)/.test(a))) || 
            img.src.replace(/[-_]\d+x\d+(?=\.[a-z]+$)/i, '');

    if (url && url.startsWith('//'))
        url = window.location.protocol + url;

    return url ?? img.src;
};

/* Extract selected text from page */
const getSelectedText = () => {
    let selectedText = window.getSelection().toString().trim();
    selectedText = selectedText.replace(/\r?\n|\r/g, '');
    return encodeURIComponent(selectedText);
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
    window.addEventListener('focus', undimPage);
}

function undimPage(){
    if (dimOverlay) {
        dimOverlay.style.opacity = 1;
        dimOverlay.style.animation = `fadeOut ${dimAnimDuration}ms ease-out forwards`;
        setTimeout(() => dimOverlay.remove(), dimAnimDuration);
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    /// For 'search in popup' keyboard hotkey and toolbar injection
    if (message.command == 'get_selected_text') {
        const selectedText = getSelectedText(); /// Remove line breaks
        return sendResponse(selectedText);
    }
    if (message.action == 'dimPage') {
        dimPage();
        return;
    }
});