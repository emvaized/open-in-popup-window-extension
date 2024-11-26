document.addEventListener("contextmenu",(e=>callback(e,'context')));

loadUserConfigs(function(c){
    if (configs.openByDragAndDrop){
        let dragStartDx, dragStartDy;
        document.addEventListener("dragstart",(e=>{
            dragStartDx = e.clientX; dragStartDy = e.clientY;
        }));
        document.addEventListener("dragend",(e=>{
            if (e.dataTransfer.dropEffect == 'none'){
                if (
                    Math.abs(e.clientX - dragStartDx) > configs.minimalDragDistance ||
                    Math.abs(e.clientY - dragStartDy) > configs.minimalDragDistance
                ) callback(e, 'drag')
            } 
        }));
    }
    if (configs.openByShiftClick){
        document.addEventListener("click",(e=>{
            if (e.shiftKey && (e.target.href || e.target.src || e.target.parentNode.href)){
                e.preventDefault();
                callback(e, 'shiftClick');
            }
        }));
    }
    if (configs.escKeyClosesPopup){
        document.addEventListener('keyup',(e)=>{
            if (e.key == 'Escape'){
                if (e.ctrlKey){
                    chrome.runtime.sendMessage({action: 'requestOpenInMainWindow'})
                } else {
                    chrome.runtime.sendMessage({action: 'requestEscPopupWindowClose'})
                }
            } 
        })
    }
})

function callback(e, type){
    const t = e.target,
    message = {
        mouseX: e.screenX, mouseY: e.screenY,
        elementHeight: t.naturalHeight ?? t.clientHeight > 0 ? t.clientHeight : t.offsetHeight,
        elementWidth: t.naturalWidth ?? t.clientWidth > 0 ? t.clientWidth : t.offsetWidth,
        availHeight: window.screen.availHeight, availWidth: window.screen.availWidth,
        selectedText: window.getSelection().toString().trim(),
        availLeft: window.screen.availLeft, type: type
    }
    if (type == 'drag' || type == 'shiftClick') {

        /// Handle IMG wrapped in A
        if (t.parentNode && t.parentNode.nodeName == 'A'){
            if (configs.imageWithLinkPreferLink){
                message['link'] = t.parentNode.href;
                message['nodeName'] = t.parentNode.nodeName;
            } else {
                message['link'] = t.src;
                message['nodeName'] = t.nodeName;
            }
        } else if (t.childNodes && t.childNodes.length == 1 && t.firstChild.nodeName == 'IMG') {
            if (configs.imageWithLinkPreferLink){
                message['link'] = t.href;
                message['nodeName'] = t.nodeName;
            } else {
                message['link'] = t.firstChild.src;
                message['nodeName'] = t.firstChild.nodeName;
            }
        } else {
            message['link'] = t.src ?? t.href ?? t.parentNode.href;
            message['nodeName'] = t.nodeName;
        }
    }
    chrome.runtime.sendMessage(message)
}