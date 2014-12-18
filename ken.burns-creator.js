/**
 * Here we have all we need from jQuery. And even more: modernizr,
 */
var utils = {
    extend: function (destination) {
        for (var i = 1, len = arguments.length; i < len; i++) {
            var source = arguments[i];
            for (var k in source) {
                if (source.hasOwnProperty(k)) {
                    destination[k] = source[k];
                }
            }
        }
        return destination;
    },

    domReady: function (callback) {
        // Mozilla, new IE and Webkit
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
     * Trigger when the page becomes invisible and the browser freezes timers and breaks CSS animations
     * https://developer.mozilla.org/en-US/docs/Web/Guide/User_experience/Using_the_Page_Visibility_API
     */
    pageVisibility: function (callback) {
        var hidden,
            visibilityChange;
        if (document.hidden !== undefined) {
            hidden = "hidden";
            visibilityChange = "visibilitychange";
        } else if (document.mozHidden !== undefined) {
            hidden = "mozHidden";
            visibilityChange = "mozvisibilitychange";
        } else if (document.msHidden !== undefined) {
            hidden = "msHidden";
            visibilityChange = "msvisibilitychange";
        } else if (document.webkitHidden !== undefined) {
            hidden = "webkitHidden";
            visibilityChange = "webkitvisibilitychange";
        }
        if (document.addEventListener !== undefined && hidden !== undefined) {
            document.addEventListener(visibilityChange, function () {
                callback(!document[hidden]);
            }, false);
            
            return !document[hidden];
        }
        
        return true;
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
    this.wrapper = element;
    this.options = options;

    this.slides = this.options.slides;
    // BUGFIX for IE8. Because we have trailing comma in array initialization by literal, like this: [1,2,3,4,].length === 5
    if (this.slides[this.slides.length - 1] === undefined) {
        this.slides.pop();
    }
    // Corner case for one slide only. Just clone the only slide instead of updating the code
    if (this.slides.length === 1) {
        this.slides.push(utils.extend({}, this.slides[0]));
    }
    this.index = 0;
    this.slide = this.slides[0];
    this.previousSlide = null;
    this.movesCount = 0;
    this.isPlaying = false;

    this.transform = utils.testCSSSupport('transform');
    if (this.transform) {
        this.transition = utils.testCSSSupport('transition', this.transform.cssStyle);
    }
    this.supportsCSS3 = this.transition && this.transform;
    
    this.initDOM();
}


Banner.prototype.initDOM = function () {
    var that = this,
        carousel = this.wrapper.querySelector('.carousel'),
        fragment = document.createDocumentFragment();

    this.carouselWidth = carousel.clientWidth;
    this.carouselHeight = carousel.clientHeight;

    for (var i = 0, len = this.slides.length; i < len; i++) {
        fragment.appendChild(this.loadImage(this.slides[i]));
    }
    carousel.appendChild(fragment);

    this.fitTextInFlexibleContainer(this.wrapper.querySelector('.action'));
    this.fitTextInFixedContainer(this.wrapper.querySelector('.headline'));

    //load jQuery to use animation as a fallback to CSS3 transitions
    if (!this.supportsCSS3 && window.jQuery === undefined) {
        utils.loadScript('//code.jquery.com/jquery-1.11.1.min.js', function () {
            that.tryToPlay();  //start playing only when jQuery is loaded
        });
    }
    
    this.isVisible = utils.pageVisibility(function (visible) {
        that.isVisible = visible;
        if (visible) {
            that.tryToPlay();
        }
        else {
            that.pausePlaying();
        }
    });
};


Banner.prototype.fitTextInFlexibleContainer = function (element) {
    if (element && window.getComputedStyle) {
        var html = element.innerHTML,
            parent = element.parentNode,
            parentWidth = parent.clientWidth,
            computedElement = window.getComputedStyle(element);
        
        parentWidth -=  Math.abs(parseFloat(computedElement.marginLeft) || 0) + 
                        Math.abs(parseFloat(computedElement.marginRight) || 0) + 
                        Math.abs(parseFloat(computedElement.left) || 0) + 
                        Math.abs(parseFloat(computedElement.right) || 0);

        element.innerHTML = '<div style="padding:0!important; border:0!important; margin:0!important;">' + html + '</div>';
        var inner = element.children[0],
            computed = window.getComputedStyle(inner),
            fontSize = parseInt(computed.fontSize);

        while (inner.scrollHeight > parseFloat(window.getComputedStyle(inner).lineHeight) || element.scrollWidth > parentWidth) {
            fontSize--;
            element.style.fontSize = fontSize + 'px';
            element.style.display = 'none';
            element.offsetHeight;   // this is an important part of the magic that forses DOM repaint
            element.style.display = '';
            if (!fontSize) {        // against infinite loop. reset to initial state
                element.style.fontSize = '';
                break;
            }
        }

        element.innerHTML = html;
    }
};


Banner.prototype.fitTextInFixedContainer = function (element) {
    if (element && window.getComputedStyle) {
        var html = element.innerHTML;

        element.innerHTML = '<div style="padding:0!important; border:0!important; margin:0!important;">' + html + '</div>';
        var inner = element.children[0],
            computed = window.getComputedStyle(inner),
            fontSize = parseInt(computed.fontSize),
            maxWidth = parseFloat(computed.width),
            maxHeight = parseFloat(computed.height);

        while (inner.scrollWidth > maxWidth || inner.scrollHeight > maxHeight) {
            fontSize--;
            element.style.fontSize = fontSize + 'px';
            element.style.display = 'none';
            element.offsetHeight;   // this is an important part of the magic that forses DOM repaint
            element.style.display = '';
            if (!fontSize) {        // against infinite loop. reset to initial state
                element.style.fontSize = '';
                break;
            }
        }

        element.innerHTML = html;
    }
};


Banner.prototype.loadImage = function (slide) {
    var that = this,
        animation = slide.animation,
        image = new Image();

    image.onload = function () {
        slide.image = this;
        slide.corners = {
            startX: animation.startX * (that.carouselWidth / animation.startScale - this.width),
            startY: animation.startY * (that.carouselHeight / animation.startScale - this.height),
            endX: animation.endX * (that.carouselWidth / animation.endScale - this.width),
            endY: animation.endY * (that.carouselHeight / animation.endScale - this.height)
        };

        if (that.movesCount) {  // show first frame immediately
            if (that.supportsCSS3) {
                image.style.opacity = 0;
            }
            else {
                $(image).css({opacity: 0});
            }
        }
        that.tryToPlay();
    };

    
    image.onerror = function() {
        that.slides.splice(that.slides.indexOf(slide),  1);
        if (that.slide === slide) {
            that.index++;
            if (that.index >= that.slides.length) {
                that.index = 0;
            }
            that.slide = that.slides[that.index];
        }    
        that.tryToPlay();
    };
    
 
    image.className = 'hidden';
    image.src = slide.imageSrc;

    // Setup transition
    if (this.supportsCSS3) {
        var transformCssStyle = this.transform.cssStyle,
            transitionJsStyle = this.transition.jsStyle;

        image.style[transitionJsStyle] = transformCssStyle + ' ' + animation.duration + 'ms ' + this.options.ease3d + 
                                         ', opacity ' + this.options.fadeSpeed + 'ms';
    }
    
    return image;
};


Banner.prototype.tryToPlay = function () {
    if (this.isVisible && !this.isPlaying && this.slides.length > 1) {
        this.makeMove();    
    }
};


Banner.prototype.pausePlaying = function () {
    clearTimeout(this.nextMoveTimeout);
    this.isPlaying = false;
};


Banner.prototype.makeMove = function () {
    // Play only if the image (and optionally jQuery) is loaded
    if (this.slide.image && (this.supportsCSS3 || window.jQuery !== undefined)) {

        this.movesCount++;
        this.isPlaying = true;
       
        if (this.supportsCSS3) {
            this.animateCSS3D();
        }
        else {
            this.animateJQuery();
        }
      
        this.hidePreviousSlide();
        this.scheduleNextMove();
    
        this.previousSlide = this.slide;
        this.index++;
        if (this.index >= this.slides.length) {
            this.index = 0;
        }
        this.slide = this.slides[this.index];
    }
    // otherwise turn on waiting mode
    else {
        this.pausePlaying();
    }
};


/**
 *  Hardware accelerated animation
 */

Banner.prototype.animateCSS3D = function () {
    var animation = this.slide.animation,
        image = this.slide.image,
        startScale = animation.startScale,
        endScale = animation.endScale,
        position = this.slide.corners,
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
    }, 160);
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
        position = this.slide.corners,
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
    
    this.nextMoveTimeout = setTimeout(function () {
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
            if (that.supportsCSS3) {
                image.style.opacity = 0;
            }
            else {
                $(image).css({opacity: 0});
            }
        }, this.options.fadeSpeed);
    }
};
