document.addEventListener("DOMContentLoaded", init);

let dxToShow = 0, dyToShow = 0, scale = 1.0, image, canvas, canvasCtx, displayElement, mouseListener;
const minScale = 0.1, maxScale = 5.0, initialScale  = 1.0, initialDx = 0, initialDy = 0, transitionDuration = 300;
let rotationWrapper, scaleSlider, zoomStepsCounter = 0, rotationStepsCounter = 0;
const rotationSteps = [0, 90, 180, 270, 360], scaleSteps = [1.0, 2.0, 4.0];
let mirroredX = false, mirroredY = false;

let listenersAdded = false;

let zoomSlider, rotateButton, zoomPercent, resetZoomButton;

function init(){
    const imageUrl = new URLSearchParams(window.location.search).get('src');
    if (!imageUrl) return;

    image = document.getElementById('oipImageViewer');
    canvas = document.getElementById('gifCanvas');
    seekSlider = document.getElementById('gifSeek');
    playPauseButton = document.getElementById('gifPlayPause');
    loopButton = document.getElementById('gifLoop');
    gifControlsContainer = document.getElementById('gifControls');
    gifStatus = document.getElementById('gifStatus');
    rotationWrapper = document.getElementById('wrapper');
    mouseListener = document.body;
    zoomSlider = document.getElementById('zoomSlider');
    rotateButton = document.getElementById('rotateButton');
    zoomPercent = document.getElementById('zoomPercent');
    resetZoomButton = document.getElementById('resetZoomButton');

    if (zoomSlider) {
        zoomSlider.value = scale;
    }
    if (zoomPercent) {
        zoomPercent.textContent = Math.round(scale * 100) + '%';
    }

    const url = decodeURIComponent(imageUrl);
    const filename = url.split('/').pop().split('?')[0].split('#')[0];
    document.title = filename ?? 'Image Viewer';
    const isGif = url.toLowerCase().endsWith('.gif');

    if (isGif) {
        image.style.display = 'none';
        canvas.style.display = 'block';
        gifControlsContainer.style.display = 'flex';
        initGifViewer(url);
    } else {
        canvas.style.display = 'none';
        gifControlsContainer.style.display = 'none';
        initImageViewer(url);
    }
    initImageControls();
    setImageListeners();
}

function initImageViewer(url) {
    image.crossOrigin = 'anonymous';
    image.src = url;
    displayElement = image;
    image.onload = function(){
        onViewerLoaded(image.naturalWidth || image.clientWidth, image.naturalHeight || image.clientHeight);
    }
    image.onerror = function(){
        onViewerLoaded(image.clientWidth, image.clientHeight);
    }
}

function initImageControls(){
    /// Show image controls panel
    const imageControls = document.getElementById('imageControls');
    imageControls.style.display = 'flex';
    imageControls.addEventListener('mousedown', function(e){ e.stopPropagation(); });
    imageControls.addEventListener('wheel', function(e){ e.stopPropagation(); });

    // Add listeners for zoom slider and rotate button
    if (zoomSlider) {
        zoomSlider.addEventListener('input', onZoomSliderInput);
        zoomSlider.addEventListener('change', onZoomSliderChange);
    }
    if (rotateButton) {
        rotateButton.addEventListener('click', onRotateButtonClick);
    }
    if (resetZoomButton) {
        resetZoomButton.addEventListener('click', onResetZoomButtonClick);
    }
}

function onViewerLoaded(width, height) {
    document.title += ` (${width}×${height})`;
    const aspectRatio = width / height;
    const toolbarHeight = window.outerHeight - window.innerHeight;
    const toolbarWidth = window.outerWidth - window.innerWidth;
    const availHeight = window.screen.availHeight;
    const availWidth = window.screen.availWidth;
    const titleBarHeight = window.outerHeight - window.innerHeight;

    chrome.runtime.sendMessage({
        action: 'updateAspectRatio', aspectRatio: aspectRatio,
        toolbarHeight: toolbarHeight, toolbarWidth: toolbarWidth,
        availHeight: availHeight, availWidth: availWidth,
        titleBarHeight: titleBarHeight
    });
}

function setImageListeners(){
    if (listenersAdded) return;
    listenersAdded = true;

    mouseListener.addEventListener('wheel', imageWheelListener, { passive: false });
    mouseListener.addEventListener('mousedown', function (e) {
        e.preventDefault();
        const evt = e || window.event;
        if (evt.button === 1) {
            closeView();
        } else if (evt.button === 0) {
            panMouseDownListener(e);
        }
    });
    mouseListener.addEventListener('dblclick', function (e) {
        const evt = e || window.event;
        if (evt.button !== 0) return;

        const xs = (e.clientX - dxToShow) / scale;
        const ys = (e.clientY - dyToShow) / scale;

        let scaleValueWithinSteps = false;
        scaleSteps.forEach(function (step) {
            if (scale === initialScale * step) scaleValueWithinSteps = true;
        });

        if (scaleValueWithinSteps) {
            if (zoomStepsCounter === scaleSteps.length - 1) {
                zoomStepsCounter = 0;
                scale = initialScale;
                dxToShow = initialDx;
                dyToShow = initialDy;
            } else {
                zoomStepsCounter += 1;
                scale = initialScale * scaleSteps[zoomStepsCounter];
                dxToShow = e.clientX - xs * scale;
                dyToShow = e.clientY - ys * scale;
            }
        } else {
            scale = initialScale;
            zoomStepsCounter = 0;
            rotationStepsCounter = 0;
            if (rotationWrapper) rotationWrapper.style.transform = 'rotate(0deg)';
            dxToShow = 0;
            dyToShow = 0;
        }

        updateTransform();
        enableTransitionsTemporarily();
    });
}

function panMouseDownListener(e) {
    e.preventDefault();

    if (displayElement) displayElement.style.cursor = 'grabbing';
    document.body.style.cursor = 'move';
    if (displayElement) displayElement.style.transition = '';

    function mouseMoveListener(e) {
        const rot = rotationSteps[rotationStepsCounter] || 0;
        const rad = rot * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        dxToShow += e.movementX * cos + e.movementY * sin;
        dyToShow += -e.movementX * sin + e.movementY * cos;
        updateTransform();
    }

    document.addEventListener('mousemove', mouseMoveListener);
    document.addEventListener('mouseup', function () {
        document.body.style.cursor = 'unset';
        if (displayElement) displayElement.style.cursor = 'grab';
        document.removeEventListener('mousemove', mouseMoveListener);
    }, { once: true });
}

function imageWheelListener(e) {
    e.preventDefault();
    if (!displayElement) return;

    const xs = (e.clientX - dxToShow) / scale;
    const ys = (e.clientY - dyToShow) / scale;
    const wheelDelta = e.wheelDeltaY ?? -e.deltaY;
    scale += wheelDelta / 300;

    if (scale < minScale) scale = minScale;
    if (scale > maxScale) scale = maxScale;
    scale = parseFloat(scale);

    dxToShow = e.clientX - xs * scale;
    dyToShow = e.clientY - ys * scale;
    updateTransform();
}

function updateTransform() {
    if (!displayElement) return;
    displayElement.style.transform = `translate(${dxToShow}px, ${dyToShow}px) scale(${scale})`;
    if (rotationWrapper) {
        const rotation = rotationSteps[rotationStepsCounter] || 0;
        rotationWrapper.style.transform = `rotate(${rotation}deg)`;
    }
    if (zoomSlider) {
        zoomSlider.value = scale;
    }
    if (zoomPercent) {
        zoomPercent.textContent = Math.round(scale * 100) + '%';
    }
}

function onZoomSliderInput() {
    const oldScale = scale;
    scale = parseFloat(zoomSlider.value);
    
    /// Calculate the center of the viewport
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    /// Convert viewport center to image coordinates using old scale and offset
    const xs = (centerX - dxToShow) / oldScale;
    const ys = (centerY - dyToShow) / oldScale;
    
    /// Adjust offset to keep the center point under the same viewport position
    dxToShow = centerX - xs * scale;
    dyToShow = centerY - ys * scale;
    
    updateTransform();
}

function onZoomSliderChange() {
    // Optional: add any logic when slider is released
}

function onRotateButtonClick() {
    rotationStepsCounter = (rotationStepsCounter + 1) % rotationSteps.length;
    updateTransform();
}

function onResetZoomButtonClick() {
    enableTransitionsTemporarily();
    scale = initialScale;
    dxToShow = initialDx;
    dyToShow = initialDy;
    rotationStepsCounter = 0;
    updateTransform();
}

function enableTransitionsTemporarily() {
    if (displayElement && displayElement.style.transition === '') {
        displayElement.style.transition = `transform ${transitionDuration}ms ease-in-out, scale ${transitionDuration}ms ease-in-out`;
    }

    setTimeout(function(){
        if (displayElement) displayElement.style.transition = '';
    }, transitionDuration);
}


function closeView() {
    window.close();
}