document.addEventListener("contextmenu",(e=>onTrigger(e,'context')));
chrome.storage.onChanged.addListener((c) => {
    loadUserConfigs((c) => setMouseListeners())
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
}

/* Change drag cursor and trigger popup on drag end */
let dragStartDx, dragStartDy;

function dragStartListener(e){
    dragStartDx = e.clientX; dragStartDy = e.clientY;
    document.addEventListener('dragover', dragOverListener, true);
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
}
function dragOverListener(e){
    if (!configs.changeDragCursor) return;
    
    if (!shouldOverrideDragCursor(e.target)){
        e.dataTransfer.dropEffect = '';
        return;
    }
    if (
        Math.abs(e.clientX - dragStartDx) > configs.minimalDragDistance || 
        Math.abs(e.clientY - dragStartDy) > configs.minimalDragDistance
    ) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'link';
    } else {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'none';
    }
}
function shouldOverrideDragCursor(target) {
    /// Reject interactive elements
    if (!target || !(target instanceof Element)) return true;
    const tag = target.tagName;
    /// Skip common interactive tags
    if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'LABEL'].includes(tag)) return false;
    /// Skip if editable (e.g., <div contenteditable>)
    if (target.isContentEditable) return false;
    /// Skip if inside any interactive zone
    if (target.closest('input, textarea, select, button, [contenteditable], [ondrop], .custom-drop-target')) {
        return false;
    }
    return true;
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

/* Common trigger function for context menu, drag-and-drop, and mod+click */
function onTrigger(e, type){
    const t = e ? e.target : lastHoveredElement;

    let selectedText = window.getSelection().toString().trim();
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

        message['nodeName'] = nodeName;
        message['link'] = link;
    }

    chrome.runtime.sendMessage(message)
}

/// For 'search in popup' keyboard hotkey
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.command == 'get_selected_text') {
        let selectedText = window.getSelection().toString().trim();
        selectedText = selectedText.replace(/\r?\n|\r/g, ''); /// Remove line breaks
        return sendResponse(encodeURIComponent(selectedText));
    }
});