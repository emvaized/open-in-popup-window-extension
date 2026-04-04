document.addEventListener("DOMContentLoaded", init);

let dxToShow = 0, dyToShow = 0, scale = 1.0, image, canvas, canvasCtx, displayElement, mouseListener;
const minScale = 0.1, maxScale = 50.0, initialScale  = 1.0, initialDx = 0, initialDy = 0, transitionDuration = 300;
let rotationWrapper, scaleSlider, rotationStepsCounter = 0;
const rotationSteps = [0, 90, 180, 270, 360], scaleSteps = [1.0, 2.0, 4.0];
let mirroredX = false, mirroredY = false;

let gifControlsContainer, seekSlider, playPauseButton, loopButton, gifStatus;
let gifFrames = [], currentFrameIndex = 0, gifTimer = null, gifPlaying = false, gifLooping = true, listenersAdded = false;

let zoomSlider, rotateButton, zoomPercent, resetZoomButton;

function init(){
    const imageUrl = new URLSearchParams(window.location.search).get('src');
    if (!imageUrl) return;

    image = document.getElementById('image');
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
    document.title = url.split('/').pop().split('?')[0] || 'Image Viewer'; /// Use filename as title if available
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

function initGifViewer(url) {
    if (playPauseButton) playPauseButton.addEventListener('click', toggleGifPlayback);
    if (loopButton) loopButton.addEventListener('click', toggleGifLoop);
    if (seekSlider) {
        seekSlider.addEventListener('input', onGifSeekInput);
        seekSlider.addEventListener('change', onGifSeekChange);
    }
    gifControlsContainer.addEventListener('mousedown', function(e){ e.stopPropagation(); });
    gifControlsContainer.addEventListener('wheel', function(e){ e.stopPropagation(); });

    fetchGif(url)
        .then(data => parseGif(new Uint8Array(data)))
        .then(result => {
            canvas.width = result.width;
            canvas.height = result.height;
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvasCtx = canvas.getContext('2d');
            displayElement = canvas;
            gifFrames = buildGifFrames(result);
            if (gifFrames.length === 0) throw new Error('No GIF frames decoded');
            currentFrameIndex = 0;
            drawGifFrame(0);
            updateGifControls();
            onViewerLoaded(result.width, result.height);
            startGifPlayback();
        })
        .catch(err => {
            console.warn('GIF playback fallback:', err);
            gifStatus.textContent = 'GIF controls unavailable';
            image.src = url;
            image.style.display = 'block';
            canvas.style.display = 'none';
            gifControlsContainer.style.display = 'none';
            displayElement = image;
            image.onload = function(){
                onViewerLoaded(image.naturalWidth || image.clientWidth, image.naturalHeight || image.clientHeight);
            }
        });
}

function fetchGif(url) {
    return fetch(url, { mode: 'cors' }).then(resp => {
        if (!resp.ok) throw new Error(resp.statusText);
        return resp.arrayBuffer();
    });
}

function onViewerLoaded(width, height) {
    const aspectRatio = width / height;
    const toolbarHeight = window.outerHeight - window.innerHeight;
    const toolbarWidth = window.outerWidth - window.innerWidth;
    const availHeight = window.screen.availHeight;
    const availWidth = window.screen.availWidth;

    chrome.runtime.sendMessage({
        action: 'updateAspectRatio', aspectRatio: aspectRatio,
        toolbarHeight: toolbarHeight, toolbarWidth: toolbarWidth,
        availHeight: availHeight, availWidth: availWidth
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
            if (stepsCounter === scaleSteps.length - 1) {
                stepsCounter = 0;
                scale = initialScale;
                dxToShow = initialDx;
                dyToShow = initialDy;
            } else {
                stepsCounter += 1;
                scale = initialScale * scaleSteps[stepsCounter];
                dxToShow = e.clientX - xs * scale;
                dyToShow = e.clientY - ys * scale;
            }
        } else {
            scale = initialScale;
            stepsCounter = 0;
            rotationStepsCounter = 0;
            if (rotationWrapper) rotationWrapper.style.transform = 'rotate(0deg)';
            dxToShow = 0;
            dyToShow = 0;
        }

        updateTransform();

        if (displayElement && displayElement.style.transition === '') {
            displayElement.style.transition = `transform ${transitionDuration}ms ease-in-out, scale ${transitionDuration}ms ease-in-out`;
        }

        setTimeout(function(){
            if (displayElement) displayElement.style.transition = '';
        }, transitionDuration);
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
    scale = parseFloat(zoomSlider.value);
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
    scale = initialScale;
    dxToShow = initialDx;
    dyToShow = initialDy;
    rotationStepsCounter = 0;
    updateTransform();
}

function closeView() {
    window.close();
}

function toggleGifPlayback() {
    if (gifPlaying) {
        stopGifPlayback();
    } else {
        startGifPlayback();
    }
}

function toggleGifLoop() {
    gifLooping = !gifLooping;
    updateGifControls();
}

function startGifPlayback() {
    if (gifFrames.length <= 1) {
        gifPlaying = false;
        updateGifControls();
        return;
    }
    gifPlaying = true;
    updateGifControls();
    scheduleNextGifFrame();
}

function stopGifPlayback() {
    gifPlaying = false;
    if (gifTimer) {
        clearTimeout(gifTimer);
        gifTimer = null;
    }
    updateGifControls();
}

function scheduleNextGifFrame() {
    if (!gifPlaying || gifFrames.length <= 1) return;
    if (gifTimer) clearTimeout(gifTimer);

    const current = gifFrames[currentFrameIndex];
    const delay = Math.max(current.delay, 20);
    gifTimer = setTimeout(() => {
        const nextIndex = (currentFrameIndex + 1) % gifFrames.length;
        if (!gifLooping && nextIndex === 0) {
            stopGifPlayback();
            return;
        }
        currentFrameIndex = nextIndex;
        drawGifFrame(currentFrameIndex);
        updateGifControls();
        scheduleNextGifFrame();
    }, delay);
}

function onGifSeekInput() {
    const index = parseInt(seekSlider.value, 10) || 0;
    currentFrameIndex = Math.min(Math.max(index, 0), gifFrames.length - 1);
    drawGifFrame(currentFrameIndex);
    updateGifControls();
}

function onGifSeekChange() {
    stopGifPlayback();
}

function updateGifControls() {
    if (!playPauseButton || !seekSlider || !loopButton) return;

    const playIcon = gifPlaying ? 'pause_circle.svg' : 'play_circle_outline.svg';
    const loopIcon = gifLooping ? 'repeat_on.svg' : 'repeat.svg';

    const playImage = playPauseButton.querySelector('img');
    const loopImage = loopButton.querySelector('img');
    if (playImage) {
        playImage.src = `icons/${playIcon}`;
        playImage.alt = gifPlaying ? 'Pause GIF' : 'Play GIF';
    }
    if (loopImage) {
        loopImage.src = `icons/${loopIcon}`;
        loopImage.alt = gifLooping ? 'Loop GIF on' : 'Loop GIF off';
    }

    playPauseButton.title = gifPlaying ? 'Pause GIF' : 'Play GIF';
    loopButton.title = gifLooping ? 'Play once' : 'Repeat';
    seekSlider.max = Math.max(gifFrames.length - 1, 0);
    seekSlider.value = currentFrameIndex;
    gifStatus.textContent = gifFrames.length > 1 ? `${currentFrameIndex + 1}/${gifFrames.length}` : 'Single-frame GIF';
}

function drawGifFrame(index) {
    if (!canvasCtx || !gifFrames[index]) return;
    canvasCtx.putImageData(gifFrames[index].imageData, 0, 0);
}

function buildGifFrames(parsed) {
    const width = parsed.width;
    const height = parsed.height;
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const ctx = offscreen.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    const frames = [];
    const backgroundColor = parsed.backgroundColor;
    let previousDisposal = 0;
    let previousImageData = null;
    let previousFrame = null;

    if (backgroundColor) {
        ctx.fillStyle = `rgba(${backgroundColor[0]}, ${backgroundColor[1]}, ${backgroundColor[2]}, 1)`;
        ctx.fillRect(0, 0, width, height);
    } else {
        ctx.clearRect(0, 0, width, height);
    }

    for (const frame of parsed.frames) {
        if (previousFrame) {
            if (previousDisposal === 2 && previousFrame) {
                if (backgroundColor) {
                    ctx.fillStyle = `rgba(${backgroundColor[0]}, ${backgroundColor[1]}, ${backgroundColor[2]}, 1)`;
                    ctx.fillRect(previousFrame.x, previousFrame.y, previousFrame.w, previousFrame.h);
                } else {
                    ctx.clearRect(previousFrame.x, previousFrame.y, previousFrame.w, previousFrame.h);
                }
            } else if (previousDisposal === 3 && previousImageData) {
                ctx.putImageData(previousImageData, 0, 0);
            }
        }

        if (frame.disposal === 3) {
            previousImageData = ctx.getImageData(0, 0, width, height);
        } else {
            previousImageData = null;
        }

        drawGifFramePixels(ctx, frame);
        const snapshot = ctx.getImageData(0, 0, width, height);
        frames.push({ imageData: snapshot, delay: frame.delay || 100 });

        previousDisposal = frame.disposal;
        previousFrame = frame;
    }

    return frames;
}

function drawGifFramePixels(ctx, frame) {
    const existing = ctx.getImageData(frame.x, frame.y, frame.w, frame.h);
    const data = existing.data;
    const palette = frame.palette;
    const transparentIndex = frame.transparent ? frame.transparencyIndex : -1;

    for (let y = 0; y < frame.h; y++) {
        for (let x = 0; x < frame.w; x++) {
            const pixelIndex = frame.pixels[y * frame.w + x];
            const outIndex = (y * frame.w + x) * 4;
            if (transparentIndex >= 0 && pixelIndex === transparentIndex) {
                continue;
            }
            const color = palette[pixelIndex] || [0, 0, 0];
            data[outIndex] = color[0];
            data[outIndex + 1] = color[1];
            data[outIndex + 2] = color[2];
            data[outIndex + 3] = 255;
        }
    }

    ctx.putImageData(existing, frame.x, frame.y);
}

function parseGif(bytes) {
    const stream = { data: bytes, pos: 0 };

    function readByte() {
        return stream.data[stream.pos++];
    }
    function readBytes(length) {
        const slice = stream.data.subarray(stream.pos, stream.pos + length);
        stream.pos += length;
        return slice;
    }
    function readUnsigned() {
        const value = readByte() | (readByte() << 8);
        return value;
    }

    const header = String.fromCharCode(...readBytes(6));
    if (!header.startsWith('GIF')) throw new Error('Invalid GIF header');

    const width = readUnsigned();
    const height = readUnsigned();
    const packed = readByte();
    const backgroundIndex = readByte();
    const pixelAspectRatio = readByte();

    const globalColorTableFlag = (packed & 0x80) !== 0;
    const colorResolution = ((packed & 0x70) >> 4) + 1;
    const sortFlag = (packed & 0x08) !== 0;
    const globalColorTableSize = 1 << ((packed & 0x07) + 1);

    const globalPalette = globalColorTableFlag ? readColorTable(globalColorTableSize) : [];
    const backgroundColor = globalPalette[backgroundIndex] || null;

    const frames = [];
    let currentGCE = { disposal: 0, delay: 0, transparent: false, transparencyIndex: 0 };

    while (true) {
        const blockId = readByte();
        if (blockId === 0x3b) break;
        if (blockId === 0x21) {
            const label = readByte();
            if (label === 0xF9) {
                const blockSize = readByte();
                const packed = readByte();
                currentGCE.disposal = (packed >> 2) & 0x07;
                currentGCE.transparent = (packed & 0x01) === 1;
                currentGCE.delay = readUnsigned() * 10;
                currentGCE.transparencyIndex = readByte();
                readByte();
            } else {
                skipSubBlocks();
            }
        } else if (blockId === 0x2c) {
            const x = readUnsigned();
            const y = readUnsigned();
            const w = readUnsigned();
            const h = readUnsigned();
            const packed = readByte();
            const lctFlag = (packed & 0x80) !== 0;
            const interlaced = (packed & 0x40) !== 0;
            const localColorTableSize = 1 << ((packed & 0x07) + 1);
            const palette = lctFlag ? readColorTable(localColorTableSize) : globalPalette;
            const lzwMinCodeSize = readByte();
            const imageData = readSubBlocks();
            let pixels = decodeLZW(lzwMinCodeSize, imageData, w * h);
            if (interlaced) pixels = deinterlacePixels(pixels, w, h);

            frames.push({
                x, y, w, h,
                palette,
                pixels,
                disposal: currentGCE.disposal,
                delay: currentGCE.delay,
                transparent: currentGCE.transparent,
                transparencyIndex: currentGCE.transparencyIndex,
            });
            currentGCE = { disposal: 0, delay: 0, transparent: false, transparencyIndex: 0 };
        } else {
            skipSubBlocks();
        }
    }

    return { width, height, frames, backgroundIndex, pixelAspectRatio, backgroundColor };

    function readColorTable(count) {
        const palette = [];
        const bytes = readBytes(count * 3);
        for (let i = 0; i < count; i++) {
            const r = bytes[i * 3];
            const g = bytes[i * 3 + 1];
            const b = bytes[i * 3 + 2];
            palette.push([r, g, b]);
        }
        return palette;
    }

    function skipSubBlocks() {
        while (true) {
            const blockSize = readByte();
            if (blockSize === 0) break;
            stream.pos += blockSize;
        }
    }

    function readSubBlocks() {
        const chunks = [];
        while (true) {
            const size = readByte();
            if (size === 0) break;
            chunks.push(...readBytes(size));
        }
        return new Uint8Array(chunks);
    }

    function decodeLZW(minCodeSize, data, pixelCount) {
        const clearCode = 1 << minCodeSize;
        const endCode = clearCode + 1;
        let codeSize = minCodeSize + 1;
        let dict = [];
        const output = [];
        let bitPos = 0;
        let bytePos = 0;

        function readCode() {
            let code = 0;
            let bitsRead = 0;
            while (bitsRead < codeSize) {
                if (bytePos >= data.length) return null;
                const currentByte = data[bytePos];
                const availableBits = 8 - bitPos;
                const takeBits = Math.min(codeSize - bitsRead, availableBits);
                const mask = (1 << takeBits) - 1;
                code |= ((currentByte >> bitPos) & mask) << bitsRead;
                bitsRead += takeBits;
                bitPos += takeBits;
                if (bitPos >= 8) {
                    bitPos -= 8;
                    bytePos++;
                }
            }
            return code;
        }

        function resetDictionary() {
            dict = [];
            const dictSize = 1 << minCodeSize;
            for (let i = 0; i < dictSize; i++) {
                dict[i] = [i];
            }
            dict[clearCode] = null;
            dict[endCode] = null;
        }

        resetDictionary();
        let prev = null;
        let code;
        while ((code = readCode()) !== null) {
            if (code === clearCode) {
                resetDictionary();
                codeSize = minCodeSize + 1;
                prev = null;
                continue;
            }
            if (code === endCode) break;

            let entry;
            if (code < dict.length && dict[code]) {
                entry = dict[code].slice();
            } else if (code === dict.length && prev) {
                entry = prev.concat(prev[0]);
            } else {
                break;
            }

            output.push(...entry);

            if (prev) {
                const newEntry = prev.concat(entry[0]);
                dict.push(newEntry);
            }

            prev = entry;

            if (dict.length === (1 << codeSize) && codeSize < 12) {
                codeSize++;
            }

            if (output.length >= pixelCount) break;
        }

        return output.slice(0, pixelCount);
    }

    function deinterlacePixels(pixels, width, height) {
        const result = new Array(pixels.length).fill(0);
        const passes = [
            { start: 0, step: 8 },
            { start: 4, step: 8 },
            { start: 2, step: 4 },
            { start: 1, step: 2 }
        ];
        let offset = 0;
        for (const pass of passes) {
            for (let y = pass.start; y < height; y += pass.step) {
                const rowStart = y * width;
                for (let x = 0; x < width; x++) {
                    result[rowStart + x] = pixels[offset++];
                }
            }
        }
        return result;
    }
}
