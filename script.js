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
    
    var carousel = this.$('.carousel'),
        fragment = document.createDocumentFragment();
    
    this.slides = this.options.slides;
    this.maxSlides = this.slides.length;
    this.index = 0;
    this.slidesShown = 0;
    this.slide = this.slides[this.index];
    this.width = this.element.clientWidth;
    this.height = this.element.clientHeight;
    if (window.getComputedStyle) {
        var computed = window.getComputedStyle(carousel);
        this.marginTop = parseInt(computed.marginTop);
        this.marginLeft = parseInt(computed.marginLeft);
    }
    else {
        this.marginTop = 0;
        this.marginLeft = 0;
    }
    this.isLoading = true;

    //CSS3 feature support is a critical part
    this.transition = utils.testCSSSupport('transition');
    this.transform = utils.testCSSSupport('transform');
    this.supportsCSS3 = this.transition && this.transform;

    this.drawStars();
  
    for (var i = 0; i < this.maxSlides; i++) {
        fragment.appendChild(this.loadImage(i));
    }
    carousel.appendChild(fragment);
    
    //Use jQuery animation as a fallback to CSS3 animation
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
    var html = '';
    
    for (var r = 0, ratesCount = this.options.rates.length; r < ratesCount; r++) {
        var rate = this.options.rates[r],
            rateInt = Math.floor(rate),
            rateSub = rate - rateInt,
            starOn = '',
            style = '';
        
        //hotfix //TODO: the star is not centered on the image, //FIXME  
        if (rateSub > .1) {
            rateSub -= .1;
        }

        html += '<div class=stars>';
        for (var i = 0; i < 6; i++) {
            if (i === rateInt) {
                starOn = ' star-on';
                style = ' style="width: ' + rateSub + 'em; margin-right: ' + (1 - rateSub) + 'em"';
            }
            else {
                style = '';
            }
            html += '<div class="star' + starOn + '"' + style + '></div>';
        }
        html += '</div>';
    }
    
    var fragment = document.createElement('div');
    fragment.innerHTML = html;
    this.$('.fixedContent').appendChild(fragment);
};


Banner.prototype.showLoader = function () {
    this.$('.loader').style.display = '';
    this.$('.status').innerHTML = 'Loading...';
    this.isLoading = true;
};


Banner.prototype.hideLoader = function () {
    this.$('.loader').style.display = 'none';
    this.$('.status').innerHTML = '';
    this.isLoading = false;
};


Banner.prototype.loadImage = function (index) {
    var that = this,
        image = new Image();

    image.onload = function () {
        var slide = that.slides[index];
        slide.image = this;
        slide.width = this.width;
        slide.height = this.height;

        if (that.isLoading && (that.supportsCSS3 || that.jQueryLoaded)) {
            that.play();
        }
    };
    
    image.onerror = function() {
        that.slides.splice(index,  1);
        that.maxSlides--;
        if (that.index === that.maxSlides) {
            that.index = 0;
        }
        
        if (that.isLoading && (that.supportsCSS3 || that.jQueryLoaded)) {
            that.play();
        }
        throw "could not load image " + index; 
    };
 
    image.src = this.slides[index].imageSrc;
    image.alt = 'image ' + index;
    image.className = 'hidden';
    image.style.opacity = 0;

    // Setup transition
    if (this.supportsCSS3) {
        var animation = this.slides[index].animation,
            transformCssStyle = this.transform.cssStyle,
            transitionJsStyle = this.transition.jsStyle;
        image.style[transitionJsStyle] = transformCssStyle + ' ' + animation.duration + 'ms ' + this.options.ease3d + ', opacity ' + this.options.fadeSpeed + 'ms';
    }
    
    return image;
};


Banner.prototype.play = function () {
    //If the image is not loaded, turn on waiting mode
    if (!this.slide.image) {
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
    this.index++;
    if (this.index === this.maxSlides) {
        this.index = 0;
    }
    this.slide = this.slides[this.index];
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
    var animation = this.slide.animation,
        startScale = animation.startScale,
        endScale = animation.endScale,
        w = this.width - this.marginLeft,
        h = this.height - this.marginTop,
        imageW = this.slide.width,
        imageH = this.slide.height;

    return {
        startX: animation.startX * (w / startScale - imageW),
        startY: animation.startY * (h / startScale - imageH),
        endX: animation.endX * (w / endScale - imageW),
        endY: animation.endY * (h / endScale - imageH)
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
    image.style.zIndex = this.slidesShown;

    // fire transition
    setTimeout(function() {
        image.style.opacity = 1;
        image.style[transformJsStyle] = 'scale(' + endScale + ') translate3d(' + position.endX + 'px,' + position.endY + 'px, 0)';
    }, 20);
    
    this.moveEnd(this.slide);
};


/**
 *  The regular JQuery animation function. Sets the index initial position to
 *  the value from chooseCorner before triggering the animation. It starts the image moving to
 *  the new position, starts the fade on the wrapper, and delays the fade out animation.
 */

Banner.prototype.animateJQuery = function () {
    var animation = this.slide.animation,
        image = this.slide.image,
        startScale = animation.startScale,
        endScale = animation.endScale,
        imageW = this.slide.width,
        imageH = this.slide.height,
        position = this.chooseCorner(),
        $image = $(image);

    // initial values
    $image.css({
        left: position.startX,
        top: position.startY,
        width: imageW,// * startScale,
        height: imageH// * startScale
    });
    
    // Bring to front
    image.className = '';
    image.style.zIndex = this.slidesShown;
    
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
    });
    */
    $image.animate({
        opacity: 1
    },  { 
        duration: this.options.fadeSpeed, 
        queue: false 
    });

    this.moveEnd(this.slide);
};


Banner.prototype.moveEnd = function (slide) {
    var that = this;

    this.slidesShown++;
    setTimeout(function () {
        that.options.onSlideComplete && that.options.onSlideComplete();
        
        setTimeout(function () {
            var image = slide.image;
            image.className = 'hidden';
            if (!that.supportsCSS3) {
                $(image).stop();
            }
            setTimeout(function () {
                image.style.opacity = 0;
            }, 20);
        }, that.options.fadeSpeed);
        
        that.play();
    }, this.options.delayBetweenSlides);
};
