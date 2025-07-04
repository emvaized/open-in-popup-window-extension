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

    /* Shift+Click */
    if (configs.openByShiftClick){
        document.addEventListener("click",onClickListener);
    } else {
        document.removeEventListener("click",onClickListener);
    }

    /* Escape key to close popup */
    if (configs.escKeyClosesPopup){
        document.addEventListener('keyup', keyUpListener)
    } else {
        document.removeEventListener('keyup', keyUpListener)
    }
}

let dragStartDx, dragStartDy;

function dragStartListener(e){
    dragStartDx = e.clientX; dragStartDy = e.clientY;
}
function dragEndListener(e){
    if (e.dataTransfer.dropEffect == 'none'){
        if (e.dataTransfer.mozUserCancelled) return; /// use Esc key to cancel drag on Firefox
        if (
            Math.abs(e.clientX - dragStartDx) > configs.minimalDragDistance ||
            Math.abs(e.clientY - dragStartDy) > configs.minimalDragDistance
        ) onTrigger(e, 'drag')
    } 
}

function keyUpListener(e){
    if (e.key == 'Escape'){
         chrome.runtime.sendMessage({action: 'requestEscPopupWindowClose'})
    }
}

function onClickListener(e){
    if (e.shiftKey && (e.target.href || e.target.src || e.target.parentNode.href)){
        e.preventDefault();
        onTrigger(e, 'shiftClick');
    }
}

function onTrigger(e, type){
    const t = e.target,
    message = {
        mouseX: e.screenX, mouseY: e.screenY,
        elementHeight: t.naturalHeight ?? t.clientHeight > 0 ? t.clientHeight : t.offsetHeight,
        elementWidth: t.naturalWidth ?? t.clientWidth > 0 ? t.clientWidth : t.offsetWidth,
        availHeight: window.screen.availHeight, availWidth: window.screen.availWidth,
        selectedText: window.getSelection().toString().trim(),
        availLeft: window.screen.availLeft, type: type
    }

    let nodeName, link;
    if (type == 'drag' || type == 'shiftClick') {
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