var Layout = function(config){
    this.conf = config || {};
    this.conf.stretch = true;
    this.autoHeight = this.conf.height == 'auto';
    this.initElement(this.conf, document.body);
    if (false != this.conf.auto) {
        window.addEventListener('resize', function(e) {//Auto resize
            this.resize();
        }.bind(this));
    };
};

Layout.prototype.initElement = function(element, p){
    element.selector = element.id;
    var el = p.querySelectorAll(element.selector).item(0);
    // $$.log('initElement', element, el, p.querySelectorAll(element.selector));
    if (!el) {
        return;
    };
    el.style.left = null;
    el.style.top = null;
    el.style.width = null;
    el.style.height = null;
    el.style.position = null;
    if (!this.autoHeight) {
        el.style.position = 'absolute';
    }
    var ch = element.children || [];
    for(var i = 0; i<ch.length; i++){
        this.initElement(ch[i], el);
    };
};

Layout.prototype.resize = function() {
//    $$.log('Resize', window);
    return this.resizeElement(this.conf, false, window.innerWidth, window.innerHeight, document.body);
};

Layout.prototype.isVisible = function(el) {
    if (el && el.style.display == 'none') {//Not visible
        return false;
    };
    return true;
};

Layout.prototype.resizeElement = function(element, horizontal, width, height, p){
    var el = p.querySelectorAll(element.selector).item(0);
    // var sizeDec = horizontal? el.outerHeight(true)-el.height() : el.outerWidth(true)-el.width();
    // $$.log('resizeElement', width, height, el, horizontal);
    var sizeDec = 0;
    var px = function (val) {
        return ''+val+'px';
    }
    if(horizontal){
        if (!this.autoHeight) {
            el.style.height = px(height-sizeDec);
        };
    } else {
        el.style.width = px(width-sizeDec);
    }
    // $$.log('resizeElement', width, height, el, horizontal, this.isVisible(el), el.offsetWidth);
    if(!this.isVisible(el))
        return {width: 0, height: 0};
    if(element.stretch){
        if(horizontal){
            el.style.width = px(width-sizeDec);
        } else {
            if (!this.autoHeight) {
                el.style.height = px(height-sizeDec);
            };
        }
    } else {
        if(horizontal){
            width = el.offsetWidth-sizeDec;
        } else {
            height = el.offsetHeight-sizeDec;
        }
    }
    var ch = element.children || [];
    var nonstretch = 0;
    var stretchcount = 0;
    for(var i = 0; i<ch.length; i++){
        if(!ch[i].stretch || !this.isVisible(el.querySelectorAll(ch[i].selector).item(0))){
            var result = this.resizeElement(ch[i], element.horizontal, width, height, el);
            if(element.horizontal)
                nonstretch += result.width;
            else
                nonstretch += result.height;
        } else {
            stretchcount++;
        }
    }
    var swidth = width;
    var sheight = height;
    if(stretchcount>0){
        if(element.horizontal){
            nonstretch = width-nonstretch;
            swidth = Math.round(nonstretch/stretchcount);
        } else {
            nonstretch = height-nonstretch;
            sheight = Math.round(nonstretch/stretchcount);
        }
    }
    var x = 0;
    var y = 0;
    for(var i = 0; i<ch.length; i++){
        //log('move', ch[i].id, x, y);
        var child = el.querySelectorAll(ch[i].selector).item(0);
        child.style.left = px(x);
        child.style.top = px(y);
        if(ch[i].stretch){
            var result = this.resizeElement(ch[i], element.horizontal, swidth, sheight, el);
        }
        if(element.horizontal){
            x += !this.isVisible(child)? 0: child.offsetWidth;
        } else {
            y += !this.isVisible(child)? 0: child.offsetHeight;
        }
    }
    return {
        width: el.offsetWidth,
        height: el.offsetHeight
    };
}
