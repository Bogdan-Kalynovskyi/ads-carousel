/**
 * Here we have all we need from jQuery. And even more: modernizr,
 */
var utils = {
    domReady: function (callback) {
        // Mozilla, Opera and Webkit
        if (document.addEventListener) {
            document.addEventListener("DOMContentLoaded", callback, false);
            // If IE event model is used
        } else if (document.attachEvent) {
            document.attachEvent("onreadystatechange", function () {
                if (document.readyState === "complete") {
                    callback();
                }
            });
        }
    },

    /**
     * Test for CSS3 features support.
     * This function is not generic, but it works well for transition and transform at least
     */
    testCSSSupport: function (feature, cssTestValue/* can be optional */) {
        var testDiv,
            featureCapital = feature.charAt(0).toUpperCase() + feature.substr(1),
            vendors = ['', 'webkit', 'moz', 'ms'],
            jsPrefixes = ['', 'Webkit', 'Moz', 'ms'],
            defaultTestValues = {
                transition: 'left 2s ease 1s',
                transform: 'rotateX(-180deg) translateZ(.5em) scale(0.5)' // this will test for 3D transform support
            },
            testFunctions = {
                transition: function (jsProperty, computed) {
                    return computed[jsProperty + 'Delay'] === '1s' && computed[jsProperty + 'Duration'] === '2s' && computed[jsProperty + 'Property'] === 'left';
                },
                transform: function (jsProperty, computed) {
                    return computed[jsProperty].substr(0, 9) === 'matrix3d(';
                }
            };

        /* test given vendor prefix */
        function isStyleSupported(feature, jsPrefixedProperty) {
            if (testDiv.style[jsPrefixedProperty] !== undefined) {
                var testVal = cssTestValue || defaultTestValues[feature],
                    testFn = testFunctions[feature];
                if (!testVal) {
                    return false;
                }
        
                //Assume browser without getComputedStyle is either IE8 or something even more poor
                if (!window.getComputedStyle) {
                    return false;
                }

                testDiv.style[jsPrefixedProperty] = defaultTestValues[feature];
                var computed = window.getComputedStyle(testDiv);

                if (testFn) {
                    return testFn(jsPrefixedProperty, computed);
                }
                else {
                    return computed[jsPrefixedProperty] === testVal;
                }
            }
        }

        //Create a div for tests and remove it afterwards
        if (!testDiv) {
            testDiv = document.createElement('div');
            document.body.appendChild(testDiv);
            setTimeout(function () {
                document.body.removeChild(testDiv);
                testDiv = null;
            }, 0);
        }

        var cssPrefixedProperty,
            jsPrefixedProperty;

        for (var i = 0; i < vendors.length; i++) {
            if (i === 0) {
                cssPrefixedProperty = feature;  //todo: this code now works for single-word features only!
                jsPrefixedProperty = feature;   //therefore box-sizing -> boxSizing won't work here
            }
            else {
                cssPrefixedProperty = '-' + vendors[i] + '-' + feature;
                jsPrefixedProperty = jsPrefixes[i] + featureCapital;
            }

            if (isStyleSupported(feature, jsPrefixedProperty)) {
                return {
                    vendor: vendors[i],
                    cssStyle: cssPrefixedProperty,
                    jsStyle: jsPrefixedProperty
                };
            }
        }

        return false;
    },
   
    loadScript: function (src, callback) {
        var head = document.querySelector('head'),
            script = document.createElement('script'),
            done = false;
        
        // Attach handlers for all browsers
        script.onload = script.onreadystatechange = function() {
            if (!done && (!this.readyState || this.readyState === "loaded" || this.readyState === "complete")) {
                done = true;
                callback();
                
                // Handle memory leak in IE
                script.onload = script.onreadystatechange = null;
                head.removeChild( script );
            }
        };
        
        script.src = src;
        head.insertBefore(script, head.firstChild);
    }
};


/*  Banner creator
 ------------------------------------------------------------------------------------------------- */

function Banner(element, options) {
    this.element = element;
    this.options = options;
    
    var list = this.options.slides;
    this.maxSlides = list.length;
    this.images = [];
    this.currentSlide = 0;
    this.isWaiting = true;

    this.drawStars();
  
    var carousel = this.$('.carousel'),
        fragment = document.createDocumentFragment();
    
    for (var i = 0; i < this.maxSlides; i++) {
        fragment.appendChild(this.loadImage(i, list[i].imageSrc));
    }
    carousel.appendChild(fragment);

    //CSS3 feature support is a critical part
    this.transition = utils.testCSSSupport('transition');
    this.transform = utils.testCSSSupport('transform');
    this.supportsCSS3 = this.transition && this.transform;
    
    //Use jQuery animation as a fallback to CSS3 animations
    if (!this.supportsCSS3) {
        var that = this;
        this.jQueryLoaded = false;
        utils.loadScript('//code.jquery.com/jquery-1.11.1.min.js', function () {
            that.jQueryLoaded = true;
            that.play();  //start playing only when jQuery is loaded
        });
    }
}


Banner.prototype.$ = function (selector) {
    return this.element.querySelector(selector);
};


Banner.prototype.drawStars = function () {
    var rate = parseInt(this.options.rate),
        rateSub = this.options.rate % 1,
        stars = this.$('.stars').children,
        star;
    
    for (var i = rate; i <= 5; i++) {
        star = stars[i];
        star.className = 'star star-on';
        if (i === rate) {
            star.style.width = rateSub + 'em';
            star.style.marginRight = (1 - rateSub) + 'em';
        }
    }
};


Banner.prototype.showLoader = function () {
    this.$('.loader').style.display = '';
    this.$('.status').innerHTML = 'Loading...';
    this.isWaiting = true;
};


Banner.prototype.hideLoader = function () {
    this.$('.loader').style.display = 'none';
    this.$('.status').innerHTML = '';
    this.isWaiting = false;
};


Banner.prototype.loadImage = function (index, src) {
    var that = this,
        img = new Image();

    img.onload = function () {
        that.images[index] = {
            element: this,
            width: this.width,
            height: this.height
        };

        if (that.isWaiting && (that.supportsCSS3 || that.jQueryLoaded)) {
            that.play();
        }
    };
    
    img.onerror = function() {
        that.options.slides.splice(index,  1);
        that.images.splice(index,  1);
        that.maxSlides = that.options.slides.length;
        if (that.currentSlide === that.maxSlides) {
            that.currentSlide = 0;
        }
        
        if (that.isWaiting && (that.supportsCSS3 || that.jQueryLoaded)) {
            that.play();
        }
        throw "could not load image " + src; 
    };

    img.src = src;
    img.alt = 'image' + index;
    img.className = 'hidden';

    if (index !== 0) {
        img.style.opacity = 0;
    }

    return img;
};


/* 3. Transitions and Movement
 ------------------------------------------------------------------------------------------------- */

/**
 * Begins the Gallery Transition and tracks the current slide
 * Also manages loading - if the interval encounters a slide
 * that has not loaded, the transition pauses.
 */
Banner.prototype.play = function () {
    //If the image is not loaded, turn on waiting mode
    if (!this.images[this.currentSlide]) {
        this.wait();
        return;
    }
    this.hideLoader();

    if (this.supportsCSS3) {
        this.animateCSS3D();
    }
    else {
        this.animateJQuery();
    }
    
    //Advance the current slide
    this.currentSlide++;
    if (this.currentSlide === this.maxSlides) {
        this.currentSlide = 0;
    }
};


/**
 * Stops the transition interval, shows the loader and
 * applies the stalled class to the visible image.
 */
Banner.prototype.wait = function () {
    this.showLoader();
};


/**
 * This function chooses a random start corner and a random end corner
 * that is different from the start. This gives a random direction effect
 * it returns coordinates used by the transition functions.
 */

Banner.prototype.chooseCorner = function () {
    var animations = this.options.slides[this.currentSlide].animations,
        image = this.images[this.currentSlide].element,
        startScale = animations.startScale,
        endScale = animations.endScale,
        start = animations.startPosition,
        end = animations.endPosition,
        w = this.element.clientWidth - 180,
        h = this.element.clientHeight,
        imw = image.width,
        imh = image.height;

    return {
        startX: start.x * (w / startScale - imw),
        startY: start.y * (h / startScale - imh),
        endX: end.x * (w / endScale - imw),
        endY: end.y * (h / endScale - imh)
    };
};


/**
 *  Hardware accelerated animation
 */

Banner.prototype.animateCSS3D = function () {
    var that = this,
        currentSlide = this.currentSlide,
        animations = this.options.slides[currentSlide].animations,
        image = this.images[currentSlide].element,
        fadeSpeed = this.options.fadeSpeed,
        startScale = animations.startScale,
        endScale = animations.endScale,
        position = this.chooseCorner(),
        transformJsStyle = this.transform.jsStyle,
        transformCssStyle = this.transform.cssStyle,
        transitionJsStyle = this.transition.jsStyle;

    // Set initial position
    image.style[transformJsStyle] = 'scale(' + startScale + ') translate3d(' + position.startX + 'px,' + position.startY + 'px, 0)';

    // Bring to front
    image.className = 'visible';
    
    // Fire transition
    image.style[transitionJsStyle] = transformCssStyle + ' ' + (animations.transitionTime + fadeSpeed) + 'ms ' + that.options.ease3d + ', ' +
                                     'opacity ' + fadeSpeed + 'ms';

    // fire transition in separate repaint frame
    setTimeout(function () {
        image.style.opacity = 1;
        image.style[transformJsStyle] = 'scale(' + endScale + ') translate3d(' + position.endX + 'px,' + position.endY + 'px, 0)';   
    }, 0);

    this.moveEnd(currentSlide);
};


/**
 *  The regular JQuery animation function. Sets the currentSlide initial position to
 *  the value from chooseCorner before triggering the animation. It starts the image moving to
 *  the new position, starts the fade on the wrapper, and delays the fade out animation. Adding
 *  fadeSpeed to duration gave me a nice crossfade so the image continues to move as it fades out
 *  rather than just stopping.
 */

Banner.prototype.animateJQuery = function () {
    var currentSlide = this.currentSlide,
        animations = this.options.slides[currentSlide].animations,
        image = this.images[currentSlide].element,
        startScale = animations.startScale,
        endScale = animations.endScale,
        sw = image.width,
        sh = image.height,
        position = this.chooseCorner(),
        $image = $(image);

    // initial values
    $image.css({
        left: position.startX,
        top: position.startY,
        width: sw * startScale,
        height: sh * startScale
    });
    
    // Bring to front
    image.className = 'visible';
    
    // fire animation
    $image.animate({
        left: position.endX,
        top: position.endY,
        width: sw * endScale,
        height: sh * endScale
    },  { 
        duration: animations.transitionTime, 
        queue: false 
    });

    $image.animate({
        opacity: 1
    },  { 
        duration: this.options.fadeSpeed, 
        queue: false 
    });

    this.moveEnd(currentSlide);
};


Banner.prototype.moveEnd = function (index) {
    var that = this;
    setTimeout(function () {
        that.options.onSlideComplete();
        setTimeout(function () {
            var image = that.images[index].element;
            image.className = 'hidden';
            if (!that.supportsCSS3) {
                $(image).stop();
            }
            setTimeout(function () {
                image.style.opacity = 0;
            }, 10);
        }, that.options.delayBetweenSlides + that.options.fadeSpeed);
        that.play();
    }, this.options.delayBetweenSlides + this.options.fadeSpeed);
};
