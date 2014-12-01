/**
 * Here we have all we need from jQuery. And even more: modernizr,
 */
var utils = {
    domReady: function (callback) {
        // Mozilla, Opera and Webkit
        if (document.addEventListener) {
            document.addEventListener("DOMContentLoaded", callback, false);
        }
        // earlier IE
        else if (document.attachEvent) {
            document.attachEvent("onreadystatechange", function () {
                if (document.readyState === "complete") {
                    callback();
                }
            });
        }
    },

    /**
     * Test for CSS3 features support. Tested to work with transition and transform.
     * Can be easily extended to support other features
     */
    testCSSSupport: function (feature, cssTransform/* for transition: transform only */) {
        var testDiv,
            featureCapital = feature.charAt(0).toUpperCase() + feature.substr(1),
            vendors = ['', 'webkit', 'moz', 'ms'],
            jsPrefixes = ['', 'Webkit', 'Moz', 'ms'],
            defaultTestValues = {
                transition: cssTransform + ' 2s ease 1s',
                transform: 'rotateX(-180deg) translateZ(.5em) scale(0.5)' // this will test for 3D transform support
            },
            testFunctions = {
                transition: function (jsProperty, computed) {
                    return computed[jsProperty + 'Property'] === cssTransform;
                },
                transform: function (jsProperty, computed) {
                    return computed[jsProperty].substr(0, 9) === 'matrix3d(';
                }
            };

        /* test given vendor prefix */
        function isStyleSupported(feature, jsPrefixedProperty) {
            if (testDiv.style[jsPrefixedProperty] !== undefined) {
                var testVal = defaultTestValues[feature],
                    testFn = testFunctions[feature];

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

    /**
     * Asynchronously load js file
     * and fire callback when completed.
     * Code taken from jQuery
     */
    loadScript: function (src, callback) {
        var head = document.querySelector('head'),
            script = document.createElement('script'),
            done = false;

        // Attach handlers for all browsers
        script.onload = script.onreadystatechange = function () {
            if (!done && (!this.readyState || this.readyState === "loaded" || this.readyState === "complete")) {
                done = true;
                callback();

                // Handle memory leak in IE
                script.onload = script.onreadystatechange = null;
                head.removeChild(script);
            }
        };

        script.src = src;
        head.insertBefore(script, head.firstChild);
    }
};


/*  Banner creator
 ------------------------------------------------------------------------------------------------- */

function Banner(element, options) {
    this.carousel = element;
    this.options = options;

    var that = this,
        carousel = this.$('.carousel'),
        fragment = document.createDocumentFragment();
    
    this.slides = this.options.slides;
    this.index = 0;
    this.slide = this.slides[0];
    this.previousSlide = null;
    this.movesCount = 0;
    this.carouselWidth = this.carousel.clientWidth;
    this.carouselHeight = this.carousel.clientHeight;
    this.isWaiting = true;

    //CSS3 feature support is a critical part
    this.transform = utils.testCSSSupport('transform');
    if (this.transform) {
        this.transition = utils.testCSSSupport('transition', this.transform.cssStyle);
    }
    this.supportsCSS3 = this.transition && this.transform;
  
    for (var i = 0, len = this.slides.length; i < len; i++) {
        fragment.appendChild(this.loadImage(this.slides[i]));
    }
    carousel.appendChild(fragment);
    
    //Use jQuery animation as a fallback to CSS3 animation
    if (!this.supportsCSS3 && typeof jQuery === 'undefined') {
        utils.loadScript('//code.jquery.com/jquery-1.11.1.min.js', function () {
            that.tryToPlay();  //start playing only when jQuery is loaded
        });
    }
}


Banner.prototype.$ = function (selector) {
    return this.carousel.querySelector(selector);
};


Banner.prototype.lockAnimation = function () {
    if (!this.isWaiting) {
        this.$('.loader').style.display = '';
        this.isWaiting = true;
    }
};


Banner.prototype.unlockAnimation = function () {
    if (this.isWaiting) {
        this.$('.loader').style.display = 'none';
        this.isWaiting = false;
    }
};


Banner.prototype.loadImage = function (slide) {
    var that = this,
        image = new Image();

    image.onload = function () {
        slide.image = this;
        slide.width = this.width;
        slide.height = this.height;
        if (that.movesCount) {  // show first frame immediately
            image.style.opacity = 0;
        }
        that.tryToPlay();
    };
    
    image.onerror = function() {
        that.slides.splice(that.slides.indexOf(slide),  1);
        if (that.slide === slide) {
            that.index = 0;
            that.slide = that.slides[0];
        }
        
        that.tryToPlay();
        throw "could not load image " + slide.imageSrc; 
    };
 
    image.src = slide.imageSrc;
    image.className = 'hidden';

    // Setup transition
    if (this.supportsCSS3) {
        var animation = slide.animation,
            transformCssStyle = this.transform.cssStyle,
            transitionJsStyle = this.transition.jsStyle;
        image.style[transitionJsStyle] = transformCssStyle + ' ' + animation.duration + 'ms ' + this.options.ease3d + 
                                         ', opacity ' + this.options.fadeSpeed + 'ms';
    }
    
    return image;
};


Banner.prototype.tryToPlay = function () {
    if (this.isWaiting && this.slides.length > 1) {
        this.makeMove();    
    }
};


Banner.prototype.makeMove = function () {
    // Play only if the image (and optionally jQuery) is loaded
    if (this.slide.image && (this.supportsCSS3 || typeof jQuery !== 'undefined')) {

        this.movesCount++;
        this.unlockAnimation();
       
        if (this.supportsCSS3) {
            this.animateCSS3D();
        }
        else {
            this.animateJQuery();
        }
      
        this.hidePreviousSlide();
        this.scheduleNextMove();
    
        // advance the current slide
        this.previousSlide = this.slide;
        this.index++;
        if (this.index === this.slides.length) {
            this.index = 0;
        }
        this.slide = this.slides[this.index];
    }
    // otherwise turn on waiting mode
    else {
        this.lockAnimation();
    }
};


/**
 * Chooses random start corner and random end corner that is different from the start. 
 * This gives a random direction effect. Returns coordinates.
 */

Banner.prototype.chooseCorner = function () {
    var animation = this.slide.animation,
        imageW = this.slide.width,
        imageH = this.slide.height;

    return {
        startX: animation.startX * (this.carouselWidth - imageW) * animation.startScale,
        startY: animation.startY * (this.carouselHeight - imageH) * animation.startScale,
        endX: animation.endX * (this.carouselWidth - imageW) * animation.endScale,
        endY: animation.endY * (this.carouselHeight - imageH) * animation.endScale
    };
};


/**
 *  Hardware accelerated animation
 */

Banner.prototype.animateCSS3D = function () {
    var animation = this.slide.animation,
        image = this.slide.image,
        startScale = animation.startScale,
        endScale = animation.endScale,
        position = this.chooseCorner(),
        transformJsStyle = this.transform.jsStyle;

    // Set initial position
    image.style[transformJsStyle] = 'scale(' + startScale + ') translate3d(' + position.startX + 'px,' + position.startY + 'px, 0)';

    // Bring to front
    image.className = '';
    image.style.zIndex = this.movesCount;

    // fire transition
    setTimeout(function() {
        image.style.opacity = 1;
        image.style[transformJsStyle] = 'scale(' + endScale + ') translate3d(' + position.endX + 'px,' + position.endY + 'px, 0)';
    }, 140);
};


/**
 *  The regular JQuery animation function
 */

Banner.prototype.animateJQuery = function () {
    var animation = this.slide.animation,
        image = this.slide.image,
        startScale = animation.startScale,
        //endScale = animation.endScale,
        imageW = this.slide.width,
        imageH = this.slide.height,
        position = this.chooseCorner(),
        $image = $(image);

    // initial values
    $image.css({
        left: position.startX,
        top: position.startY,
        width: imageW * startScale,
        height: imageH * startScale
    });
    
    // Bring to front
    image.className = '';
    image.style.zIndex = this.movesCount;
/*    
    // fire animation
    $image.animate({
        left: position.endX,
        top: position.endY,
        width: imageW * endScale,
        height: imageH * endScale
    },  { 
        duration: animation.duration + this.options.fadeSpeed, 
        queue: false 
    });*/
    $image.animate({
        opacity: 1
    },  { 
        duration: this.options.fadeSpeed, 
        queue: false 
    });
};


/* Schedule the next animation */
Banner.prototype.scheduleNextMove = function () {
    var that = this;
    
    setTimeout(function () {
        that.options.onSlideComplete && that.options.onSlideComplete();
        that.makeMove();
    }, this.slide.animation.duration + this.options.pauseBetweenAnimations);
};


/* Once displayed, the images should obligatory be hidden */ 
Banner.prototype.hidePreviousSlide = function () {
    if (this.previousSlide) {
        var that = this,
            image = this.previousSlide.image;

        setTimeout(function () {
            image.className = 'hidden';
            if (!that.supportsCSS3) {
                $(image).stop();
            }
            setTimeout(function () {
                image.style.opacity = 0;
            }, 140);
        }, this.options.fadeSpeed);
    }
};
