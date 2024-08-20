document.addEventListener("DOMContentLoaded", init);

let dxToShow = 0, dyToShow = 0, scale = 1.0, image, stepsCounter = 0, mouseListener;
const minScale = 0.1, maxScale = 50.0, initialScale  = 1.0, initialDx = 0, initialDy = 0, transitionDuration = 300;
let rotationWrapper, scaleSlider, rotationStepsCounter = 0;
const rotationSteps = [0, 90, 180, 270, 360], scaleSteps = [1.0, 2.0, 4.0];
let mirroredX = false, mirroredY = false;

function init(){
    const imageUrl = window.location.href.split('?src=')[1];
    if (!imageUrl) return;

    image = document.getElementById('image');
    image.src = imageUrl;
    document.title = imageUrl;
    mouseListener = document.getElementById('mouseListener');
    rotationWrapper = document.getElementById('wrapper');

    /// add mouse listeners
    setImageListeners();

    /// update window size on image load (in case we got it wrong)
    image.onload = function(){
        const aspectRatio = (image.naturalWidth ?? image.clientWidth) / (image.naturalHeight ?? image.clientHeight);
        const toolbarHeight = window.outerHeight - window.innerHeight;
        const toolbarWidth = window.outerWidth - window.innerWidth;
        chrome.runtime.sendMessage({ 
            action: 'updateAspectRatio', aspectRatio: aspectRatio,
            toolbarHeight:toolbarHeight, toolbarWidth:toolbarWidth
          });
    }
}

function setImageListeners(){
    /// scale on wheel
    mouseListener.addEventListener('wheel', imageWheelListener, { passive: false });
    /// move on pad down
    mouseListener.addEventListener('mousedown', function (e) {
        e.preventDefault();
        evt = e || window.event;
        if ("buttons" in evt) {
            if (evt.button == 1) {
                /// Middle click to close view
                closeView();
            } else if (evt.button == 0) {
                /// Left button
                panMouseDownListener(e)
            }
            // else if (evt.button == 2) {
            //     /// Right button
            //     rotateMouseDownListener(e)
            // }
        }
    });
    /// Double click to scale up listener
    mouseListener.addEventListener('dblclick', function (e) {
        evt = e || window.event;
        if ("buttons" in evt) {
            if (evt.button == 0) {

                /// take the scale into account with the offset
                let xs = (e.clientX - dxToShow) / scale,
                    ys = (e.clientY - dyToShow) / scale;

                let scaleValueWithinSteps = false;
                scaleSteps.forEach(function (step) {
                    if (scale == initialScale * step) scaleValueWithinSteps = true;
                })

                if (scaleValueWithinSteps) {
                    if (stepsCounter == scaleSteps.length - 1) {
                        stepsCounter = 0;
                        scale = initialScale;
                        dxToShow = initialDx;
                        dyToShow = initialDy;
                    }
                    else {
                        stepsCounter += 1;
                        scale = initialScale * scaleSteps[stepsCounter];
                        /// reverse the offset amount with the new scale
                        dxToShow = e.clientX - xs * scale;
                        dyToShow = e.clientY - ys * scale;
                    }
                    image.style.transform = `translate(${dxToShow}px,${dyToShow}px) scale(${scale})`;
                } else {
                    /// Return image to initial scale
                    scale = initialScale;
                    stepsCounter = 0;
                    rotationStepsCounter = 0;
                    rotationWrapper.style.transform = 'rotate(0deg)';

                    dxToShow = 0; dyToShow = 0;
                    image.style.transform = 'translate(0,0)';
                }

                if (image.style.transition == '')
                    image.style.transition = `transform ${transitionDuration}ms ease-in-out, scale ${transitionDuration}ms ease-in-out`;
                // image.style.scale = scale;

                setTimeout(function(){
                    image.style.transition = '';
                }, transitionDuration)
            }
        }
    });
}

function panMouseDownListener(e) {
    e.preventDefault();

    image.style.cursor = 'grabbing';
    document.body.style.cursor = 'move';
    image.style.transition = '';

    function mouseMoveListener(e) {
        dxToShow = dxToShow + e.movementX;
        dyToShow = dyToShow + e.movementY;

        image.style.transform = `translate(${dxToShow}px, ${dyToShow}px) scale(${scale})`;
    }

    document.addEventListener('mousemove', mouseMoveListener);
    document.addEventListener('mouseup', function () {
        document.body.style.cursor = 'unset';
        image.style.cursor = 'grab';
        document.removeEventListener('mousemove', mouseMoveListener);
    });
}

function imageWheelListener(e) {
    e.preventDefault();

    /// take the scale into account with the offset
    const xs = (e.clientX - dxToShow) / scale,
    ys = (e.clientY - dyToShow) / scale;


    const wheelDelta = e.wheelDelta ?? -e.deltaY;
    scale += wheelDelta / 300;

    if (scale < minScale) scale = minScale;
    if (scale > maxScale) scale = maxScale;

    scale = parseFloat(scale);

    /// reverse the offset amount with the new scale
    dxToShow = e.clientX - xs * scale;
    dyToShow = e.clientY - ys * scale;

    // image.style.transition = '';
    image.style.transform = `translate(${dxToShow}px, ${dyToShow}px) scale(${scale})`;
}

function closeView() {
    window.close()
}