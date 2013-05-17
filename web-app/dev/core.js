if (typeof String.prototype.startsWith != 'function') {
    String.prototype.startsWith = function (str){
        return this.slice(0, str.length) == str;
    };
};

if (typeof String.prototype.endsWith != 'function') {
    String.prototype.endsWith = function (str){
        return this.slice(-str.length) == str;
    };
};

var dateFormat = function () {
    var token = /d{1,4}|m{1,4}|w{1,2}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,
        timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
        timezoneClip = /[^-+\dA-Z]/g,
        pad = function (val, len) {
            val = String(val);
            len = len || 2;
            while (val.length < len) val = "0" + val;
            return val;
        };

    // Regexes and supporting functions are cached through closure
    return function (date, mask, utc) {
        var dF = dateFormat;

        // You can't provide utc if you skip other args (use the "UTC:" mask prefix)
        if (arguments.length == 1 && Object.prototype.toString.call(date) == "[object String]" && !/\d/.test(date)) {
            mask = date;
            date = undefined;
        }

        // Passing date through Date applies Date.parse, if necessary
        date = date ? new Date(date) : new Date;
        if (isNaN(date)) throw SyntaxError("invalid date");

        // Allow setting the utc argument via the mask
        if (mask.slice(0, 4) == "UTC:") {
            mask = mask.slice(4);
            utc = true;
        }

        var _ = utc ? "getUTC" : "get",
            d = date[_ + "Date"](),
            D = date[_ + "Day"](),
            w = date[_ + "Week"](),
            m = date[_ + "Month"](),
            y = date[_ + "FullYear"](),
            H = date[_ + "Hours"](),
            M = date[_ + "Minutes"](),
            s = date[_ + "Seconds"](),
            L = date[_ + "Milliseconds"](),
            o = utc ? 0 : date.getTimezoneOffset(),
            flags = {
                d:    d,
                dd:   pad(d),
                ddd:  dF.i18n.dayNames[D],
                dddd: dF.i18n.dayNames[D + 7],
                w:    w,
                ww:   pad(w),
                m:    m + 1,
                mm:   pad(m + 1),
                mmm:  dF.i18n.monthNames[m],
                mmmm: dF.i18n.monthNames[m + 12],
                yy:   String(y).slice(2),
                yyyy: y,
                h:    H % 12 || 12,
                hh:   pad(H % 12 || 12),
                H:    H,
                HH:   pad(H),
                M:    M,
                MM:   pad(M),
                s:    s,
                ss:   pad(s),
                l:    pad(L, 3),
                L:    pad(L > 99 ? Math.round(L / 10) : L),
                t:    H < 12 ? "a"  : "p",
                tt:   H < 12 ? "am" : "pm",
                T:    H < 12 ? "A"  : "P",
                TT:   H < 12 ? "AM" : "PM",
                Z:    utc ? "UTC" : (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
                o:    (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
                S:    ["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
            };

        return mask.replace(token, function ($0) {
            return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
        });
    };
}();

// Internationalization strings
dateFormat.i18n = {
    dayNames: [
        "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
        "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
    ],
    monthNames: [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
    ]
};

// For convenience...
Date.prototype.format = function (mask, utc) {
    return dateFormat(this, mask, utc);
};

Date.prototype.getWeek = function (dowOffset) {
    dowOffset = typeof(dowOffset) == 'int' ? dowOffset : 0; //default dowOffset to zero
    var newYear = new Date(this.getFullYear(),0,1);
    var day = newYear.getDay() - dowOffset; //the day of week the year begins on
    day = (day >= 0 ? day : day + 7);
    var daynum = Math.floor((this.getTime() - newYear.getTime() -
    (this.getTimezoneOffset()-newYear.getTimezoneOffset())*60000)/86400000) + 1;
    var weeknum;
    if(day < 4) {
        weeknum = Math.floor((daynum+day-1)/7) + 1;
        if(weeknum > 52) {
            nYear = new Date(this.getFullYear() + 1,0,1);
            nday = nYear.getDay() - dowOffset;
            nday = nday >= 0 ? nday : nday + 7;
            weeknum = nday < 4 ? 1 : 53;
        }
    }
    else {
        weeknum = Math.floor((daynum+day-1)/7);
    }
    return weeknum;
};

$$.override = function(method, newmethod, instance) {
    if (!method || !newmethod) {
        return false;
    };
    if (!instance) {
        instance = this;
    };
    if (!instance[method]) {
        return false;
    };
    var superMethod = instance[method].bind(instance);
    instance[method] = function() {
        var superArgs = arguments;
        superMethod.asis = function() {
            return superMethod.apply(instance, superArgs);
        }
        var args = [superMethod];
        for(var i = 0; i<superArgs.length; i++) {
            args.push(superArgs[i]);
        };
        return newmethod.apply(instance, args);
    }
    return true;
}

var _tagInArray = function(arr, t) {
    var index = -1;
    if (typeof(t) == 'string') {
        index = arr.indexOf(t);
    } else {
        for (var j = 0; j<arr.length; j++) {
            var m = t.exec(arr[j]);
            if (m) {
                index = j;
                break;
            }
        }
    }
    return index;
}

$$.createSorter = function(sorter) {
    var sorts = [];
    var arr = this.parseTags(sorter);
    for (var i = 0; i<arr.length; i++) {
        var txt = arr[i];
        var inverse = false;
        if (txt.startsWith('!')) {
            inverse = true;
            txt = txt.substr(1);
        }
        if ('*title*' == txt) {
            sorts.push({type: 'title', inverse: inverse});
        } else if ('*created*' == txt) {
            sorts.push({type: 'created', inverse: inverse});
        } else if ('*edited*' == txt) {
            sorts.push({type: 'edited', inverse: inverse});
        } else {
            if (txt.startsWith('/')) {
                sorts.push({type: 'tag_exp', exp: new RegExp(txt.substr(1)), inverse: inverse});
            } else {
                sorts.push({type: 'tag', tag: txt, inverse: inverse});
            }
        }
    }
    return function (a, b) {
        for (var i = 0; i<sorts.length; i++) {
            var sort = sorts[i];
            var mul = sort.inverse? -1: 1;
            if (sort.type == 'title') {
                return a.title>b.title? mul: -mul;
            }
            if (sort.type == 'edited') {
                if (a.edited && b.edited)
                    return a.edited.getTime()>b.edited.getTime()? mul: -mul;
            }
            if (sort.type == 'created') {
                if (a.created && b.created)
                    return a.created.getTime()>b.created.getTime()? mul: -mul;
            }
            if (sort.type == 'tag_exp') {
                var hasA = a.hasTag(sort.exp);
                var hasB = b.hasTag(sort.exp);
                if (hasA && !hasB) {
                    return mul;
                }
                if (!hasA && hasB) {
                    return -mul;
                }
                if (hasA && hasB) {
                    return hasA>hasB? mul: -mul;
                }
            }
            if (sort.type == 'tag') {
                var hasA = a.hasTag(sort.tag);
                var hasB = b.hasTag(sort.tag);
                if (hasA && !hasB) {
                    return mul;
                }
                if (!hasA && hasB) {
                    return -mul;
                }
            }
        }
        return 0;
    }.bind(this);
}

$$.createOperationsFilter = function(filter, all) {
    if (!filter) return null;
    if (!Array.isArray(filter)) {
        filter = [filter];
    }
    var ops = [];
    for (var i = 0; i<filter.length; i++) {
        if (filter[i].startsWith('!')) {
            ops.push({op: '!', value: filter[i].substr(1)});
        }
        if (filter[i].startsWith('l') || filter[i].startsWith('g')) {
            var value = filter[i].substr(1);
            var pattern = null;
            if (value.startsWith('[') && value.indexOf(']') !=-1) {
                pattern = value.substring(1, value.indexOf(']'));
                value = value.substring(value.indexOf(']')+1);
            }
            ops.push({op: filter[i].charAt(0), value: value, pattern: pattern});
        }
    }
    if (ops.length == 0) return null;
    return function (item, el) {
        for(var i = 0; i<ops.length; i++) {
            var op = ops[i];
            var ok = true;
            if(op.op == '!') {
                // Not equals
                ok = item.tags.indexOf(op.value) == -1;
            }
            if (op.op == 'l' || op.op == 'g') {
                ok = false;
                for (var j = 0; j<item.tags.length; j++) {
                    if (op.pattern && !item.tags[j].startsWith(op.pattern)) {
                        continue;
                    }
                    var ok = ('l' == op.op && item.tags[j]<op.value) || ('g' == op.op && item.tags[j]>op.value);
                    if (ok) {
                        break;
                    }
                }
            }
            if (all && !ok) {
                return false;
            }
            if (!all && ok) {
                return true;
            }
        };
        return all? true: false;
    }
}
$$.itemPrototype.prototype.normalizeTag = function(tag) {
    if (tag && tag.indexOf && tag.indexOf(' ') != -1 && (!tag.startsWith('[') || !tag.endsWith(']'))) {
        return '['+tag+']';
    }
    return tag;
}
$$.itemPrototype.prototype.editTag = function(remove, add) {
    if (!this.tags) {
        return false;
    }
    var changed = false;
    if (remove && Array.isArray(remove)) {
        for (var i = 0; i<remove.length; i++) {
            var index = 0;
            while((index = _tagInArray(this.tags, remove[i])) != -1) {
                this.tags.splice(index, 1);
                changed = true;
            }
        }
    }
    if (add && Array.isArray(add)) {
        for (var i = 0; i<add.length; i++) {
            var tag = add[i];
            if (tag.indexOf(' ') != -1 && (!tag.startsWith('[') || !tag.endsWith(']'))) {
                tag = '['+tag+']';
            }
            var index = _tagInArray(this.tags, tag);
            if (index == -1) {
                // Add
                this.tags.push(tag);
                changed = true;
            }
        }
    }
    return changed;
};

$$.itemPrototype.prototype.hasTag = function(tag, all) {
    var tags = tag;
    if (tag && !Array.isArray(tag)) {
        tags = [tag];
    }
    if(this.tags && this.tags.indexOf) {
        for (var i = 0; i<tags.length; i++) {
            var t = this.normalizeTag(tags[i]);
            var index = _tagInArray(this.tags, t);
            var has = index != -1;
            if (all && !has) {
                return null;
            }
            if (!all && has) {
                return this.tags[index];
            }
        };
        if (all) {
            return tags;
        }
    }
    return null;
};

$$.el = function(name, parent, attr, text) {
    var el = document.createElement(name);
    if (parent) { // Have parent
        parent.appendChild(el);
    };
    if (attr) {
        for (var id in attr) {
            var value = attr[id];
            if (value && typeof(value) == 'string') {
                el.setAttribute(id, value);
            };
        };
    }
    if (text) {
        // Add text content
        el.appendChild(document.createTextNode(text));
    }
    return el;
}

$$.addMessage = function(text, options) {
    var className = 'message';
    if (options && options.err) {
        className += ' errorMessage';
    }
    var fade = !options || !options.nofade;
    if (fade) {
        className += ' fade';
    }
    var el = this.el('div', this.messagesDiv, {
    }, text);
    el.className = className;
    el.addEventListener('click', function() {
        if (el.parentNode) {
            el.parentNode.removeChild(el);
        }
    }.bind(this));
    if (fade) {
        setTimeout(function() {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        }.bind(this), 5000);
    }
}

$$.initUI = function() {
    this.shortDate = 'm/d';
    this.shortDateTime = 'm/d H:MM';
    // Create center, input, items place
    this.messagesDiv = this.el('div', document.body, {
        'class': 'messages'
    });
    var root = document.createElement('div');
    root.className = 'root';
    document.body.appendChild(root);
    var titleInputWrap = document.createElement('div');
    titleInputWrap.className = 'inputWrap';
    root.appendChild(titleInputWrap);
    var tbl = this.el('div', titleInputWrap, {
        style: 'display: inline-table;'
    });
    var row = this.el('div', tbl, {
        style: 'display: table-row;'
    });
    var leftCell = this.el('div', row, {
        style: 'display: table-cell; width: 100%;'
    });
    var centerCell = this.el('div', row, {
        style: 'display: table-cell'
    });
    var rightCell = this.el('div', row, {
        style: 'display: table-cell'
    });
    this.configButton = this.el('button', centerCell, {
        'class': 'configButton'
    }, 'Config');
    this.saveButton = this.el('button', rightCell, {
        'class': 'notShown'
    }, 'Save');
    this.saveButton.onclick = function() {
        this.save({}, function(err, result) {
            if (err) {
                alert(err);
                return;
            };
            this.addMessage(result || 'Saved');
//            $$.log('Save result:', result);
        }.bind(this));
    }.bind(this);
    this.events.on('dirty', function() {
        this.saveButton.className = '';
    }.bind(this));
    this.events.on('saved', function() {
        this.saveButton.className = 'notShown';
    }.bind(this));
    this.titleInput = document.createElement('input');
    this.titleInput.setAttribute('type', 'text');
    this.titleInput.className = 'input';
    leftCell.appendChild(this.titleInput);
    this.titleInput.addEventListener('keypress', function (evt) {
        if (evt.which == 13) {
            var value = this.titleInput.value.trim();
            if (value) {
                this.load(value);
            }
            return false;
        }
        return true;
    }.bind(this));
    this.itemsRoot = document.createElement('div');
    this.itemsRoot.className = 'itemsRoot';
    root.appendChild(this.itemsRoot);
    this.events.on('change', function (evt) {
        if (evt.remove) {
            // Item removed - close all shown items
            this.close(evt.item);
            return;
        };
        if (evt.edit) {
            var nl = this.itemsRoot.querySelectorAll('div[data-title="'+evt.title+'"][data-role="show"]');
            if (nl.length>0) {
                // Already shown - send 'hide' event
                this.events.emit('hide', {title: evt.title}); // Old title
                this.render(evt.item, nl[0], {});
            }
        }
    }.bind(this));
};

$$.scrollToEl = function (el) {
    if (!el) {
        return;
    };
    window.scrollTo(window.scrollX, el.offsetTop);
};

$$.navigate = function(item) {
    window.history.pushState({title: item.title}, item.title, '#'+item.title);
    window.title = item.title;
    var nl = this.itemsRoot.querySelectorAll('div[data-title="'+item.title+'"][data-role="show"]');
    if (nl.length>0) {
        // Already shown - scroll
        this.scrollToEl(nl[0]);
    };
};

$$.parseTagDef = function(text, from, to) {
    var result = {params: {}};
    var paramsFrom = from;
    var endName = text.indexOf(' ', paramsFrom);
    if (endName == -1 || endName>to) {
            result.name = text.substring(from, to);
            return result;
    }
    result.name = text.substring(paramsFrom, endName).trim();
    paramsFrom = endName;
    while(text.charAt(paramsFrom) == ' ') {
        // Check ="
        var paramValueStart = text.indexOf('="', paramsFrom);
        if (paramValueStart == -1 || paramValueStart>to) {
            $$.log('Invalid tmpl parameters start');
            return null;
        }
        var paramValueEnd = this.skipPair(text, paramValueStart, '="', '"');
        if (paramValueEnd == -1 || paramValueEnd>to) {
            $$.log('Invalid tmpl parameters end');
            return null;
        }
        var name = text.substring(paramsFrom, paramValueStart).trim();
        var value = text.substring(paramValueStart+2, paramValueEnd-1);
        paramsFrom = paramValueEnd;
        result.params[name] = value;
    }
    return result;
}

$$.tmpl = function(text, data, item, reason) {
//    $$.log('Parse tmpl', text, reason);
    var st = '#{';
    var ed = '"}';
    var start = 0;
    var result = '';
    var found = -1;
    while ((found = (text || '').indexOf(st, start)) != -1) {
        var foundEnd = this.skipPair(text, found, st, ed);
        if (-1 == foundEnd) {
            $$.log('Not a pair');
            return null;
        }
        var tagDef = this.parseTagDef(text, found+2, foundEnd);
        if (!tagDef) {
                $$.log('Invalid tmpl macro');
                return null;
        }
        if (start<found) {
            result += text.substring(start, found);
        }
//        $$.log('tmpl', macroName, params);
        var macro = this.tmplOp[tagDef.name];
        if (!macro) {
            $$.log('Invalid macro', tagDef.name);
        } else {
            var value = macro.handler.call(this, tagDef.params, data, item);
            if (result) {
                result += value;
            } else {
                result = value;
            }
        }
        start = foundEnd;
    };
    if (start<(text || '').length) {
        result += text.substring(start);
    }
    return result;
}

$$.tmplOp = {};
$$.tmplOp.each = {
    handler: function (params, data, item) {
        var result = '';
        var items = this.tmpl(params.values || '', data, item, 'each items');
//        $$.log('values:', items, items.length);
        if (items && items.length>0) {
            if (params.header) {
                result += this.tmpl(params.header, data, item);
            }
            var name = this.tmpl(params.name || '', data, item, 'each name');
            if (!name) {
                $$.log('Invalid param name', name, params.name);
                return '!err!';
            }
            if (params.groupTag) {
                var tags = this.tmpl(params.groupTag, data, item);
                if (!Array.isArray(tags)) tags = this.parseTags(tags);
                for (var i = 0; i<tags.length; i++) {
                    if (tags[i].startsWith('/')) {
                        // RegExp
                        tags[i] = new RegExp(tags[i].substring(1));
                    } else {
                        tags[i] = item.normalizeTag(tags[i]);
                    }
                };
                var groups = [];
                for (var i = 0; i<items.length; i++) {
                    var tag = items[i].hasTag(tags) || '';
                    var gr = null;
                    for (var j = 0; j<groups.length; j++) {
                        if (groups[j].tag == tag) {
                            gr = groups[j];
                            break;
                        }
                    }
                    if (!gr) {
                        gr = {tag: tag, items: []};
                        if (!tag) {
                            groups.splice(0, 0, gr);
                        } else {
                            groups.push(gr);
                        }
                    }
                    gr.items.push(items[i]);
                }
                var groupTemplate = params.groupTemplate || '';
                for (var j = 0; j<groups.length; j++) {
                    var gr = groups[j];
                    if (!gr.tag) {
                        result += this.tmpl(params.noGroupTitle || '(no title)', data, item, 'each template');
                    } else {
                        data.tag = gr.tag;
                        data.group = this.formatTag(gr.tag, item);
                        result += this.tmpl(groupTemplate, data, item);
                    }
                    for (var i = 0; i<gr.items.length; i++) {
                        data[name] = gr.items[i];
                        result += this.tmpl(params.template || '', data, item, 'each template');
                    }
                }
                return result;
            }
            for (var i = 0; i<items.length; i++) {
                data[name] = items[i];
                result += this.tmpl(params.template || '', data, item, 'each template');
            }
        }
        return result;
    }
};
$$.tmplOp.tmpl = {
    handler: function (params, data, item) {
        var template = '';
        if (params.ref) {
            var ref = this.tmpl(params.ref, data, item);
            if (ref) {
                var items = this.find({title: ref});
                if (items.length == 0) {
                    return '';
                }
                template = items[0].text;
            }
        } else {
            template = this.tmpl(params.template, data, item);
        }
        return this.tmpl(template, data, item);
    }
};
$$.createFindConfig = function (title, tags, filterOut, sort) {
    var config = {
    };
    if (title) {
        config.title = title;
    };
    if (tags) {
        config.tags = this.parseTags(tags);
    };
    if (filterOut) {
        config.filterOut = this.createOperationsFilter(filterOut, true);
    }
    if (sort) {
        config.sort = this.createSorter(sort);
    }
    return config;
}
$$.tmplCreateFindConfig = function(params, data, item) {
    var config = {
    };
    if (params.title) {
        config.title = this.tmpl(params.title, data, item, 'find title');
    };
    if (params.tags) {
        config.tags = this.tmpl(params.tags, data, item, 'find tags');
    };
    if (params.tagsOp) {
        config.filterOut = this.parseTags(this.tmpl(params.tagsOp, data, item));
    }
    if (params.sort) {
        config.sort = this.tmpl(params.sort, data, item, 'sort');
    } else {
        config.sort = '*title*';
    }
    return this.createFindConfig(config.title, config.tags, config.filterOut, config.sort);
}

$$.tmplOp.find = {
    handler: function (params, data, item) {
        var config = this.tmplCreateFindConfig(params, data, item);
        var items = this.find(config);
        if (!item['static'] && params.reload && this.tmpl(params.reload, data, item, 'watch')) {
            // Subscribe to edit events
            var hideEvent = function (evt) {
                if (evt.title == item.title) {
                    // Unsubscribe
                    this.events.off('hide', hideEvent);
                    this.events.off('change', changeEvent);
                }
            }.bind(this);
            var changeEvent = function (evt) {
                var ourCase = false;
                for (var i = 0; i<items.length; i++) {
                    if (items[i].title == evt.title) {
                        // Changed item from our list
                        ourCase = true;
                        break;
                    }
                }
                if (!ourCase) {
                    // Check if item selectable by config
                    config.title = evt.item.title;
                    if (this.find(config).length>0) {
                        ourCase = true;
                    }
                }
                if (ourCase) {
                    // Reload
//                    $$.log('Reloading item', item);
                    var opts = item.renderOptions || {};
                    opts.navigate = false;
                    this.open(item, opts);
                }
            }.bind(this);
//            $$.log('Subscribing to change events');
            this.events.on('hide', hideEvent);
            this.events.on('change', changeEvent);
        };
        if (params.type) {
            var result = [];
            for (var i = 0; i<items.length; i++) {
                if (params.type == 'title') {
                    result.push(items[i].title);
                }
            }
            return result;
        }
        return items;
    }
};

$$.tmplOp.date = {
    handler: function (params, data, item) {
        var format = 'yyyy-mm-dd';
        if (params.format) {
            format = this.tmpl(params.format, data, item, 'date format');
        }
        var dt = new Date();
        if (params.value) {
            var value = this.tmpl(params.value, data, item, 'date value');
            if (value && value.getTime) {
                dt = value;
            }
        }
        if (params.adjust) {
            var adj = this.tmpl(params.adjust, data, item, 'data adj');
            var rexp = /(\+|\-|\=)(\d+)(y|m|w|d|e)/g;
            var def = {
                y: {
                    method: 'FullYear'
                },
                m: {
                    handler: function(dt, mul, value) {
                        if (mul == 0) {
                            dt.setMonth(value-1);
                        } else {
                            dt.setMonth(dt.getMonth() + mul*value);
                        }
                    }
                },
                w: {
                    handler: function(dt, mul, value) {
                        if (mul == 0) {
                            $$.log('Setting week not supported')
                        } else {
                            dt.setDate(dt.getDate() + 7*mul*value);
                        }
                    }
                },
                d: {
                    method: 'Date'
                },
                e: {
                    handler: function(dt, mul, value) {
                        if (mul == 0) {
                            var day = dt.getDay();
                            dt.setDate(dt.getDate()+(value-day));
                        } else {
                            $$.log('Setting week day not supported')
                        }
                    }
                }
            }
            var m = null;
            while ((m = rexp.exec(adj))) {
                var sign = m[1];
                var val = parseInt(m[2]);
                var type = m[3];
                var op = def[type];
                if (!op) {
                    this.addMessage('Date adjustment not supportd: '+m[0], {err: true});
                } else {
                    var mul = '=' == sign? 0: ('-' == sign? -1: 1);
                    if (op.method) {
                        if (mul == 0) {
                            dt['set'+op.method].call(dt, val);
                        } else {
                            var now = dt['get'+op.method].call(dt);
                            dt['set'+op.method].call(dt, now+mul*val);
                        }
                    }
                    if (op.handler) {
                        op.handler(dt, mul, val);
                    }
                };
            }
        }
        return dt.format(format);
    }
}

$$.tmplOp.hasTag = {
    handler: function (params, data, item) {
        var value = item;
        if (params.value) {
            value = this.tmpl(params.value || '', data, item, 'out value');
            if (!value || !value.tags) {
                // Invalid value
                return null;
            }
        }
        var tags = this.tmpl(params.tag || params.tags, data, item, 'find tags');
        if (!Array.isArray(tags)) {
            tags = this.parseTags(tags);
        }
        var all = this.tmpl(params.all, data, item)? true: false;
        var hasTag = value.hasTag(tags, all);
        return hasTag || '';
    }
}

$$.tmplOp.out = {
    handler: function (params, data, item) {
        var obj = data;
//        $$.log('out in', params.value, '=', obj);
        if (params.text) {
            // Return text
            return this.tmpl(params.text, data, item, 'out text');
        }
        var value = this.tmpl(params.value || '', data, item, 'out value');
        var result = '';
        if (!value) {
            return '!err!';
        };
        var arr = value.split('.');
        for (var i = 0; i<arr.length; i++) {
            var res = obj[arr[i]];
//            $$.log('arr', i, arr[i], res, typeof(res));
            if (typeof(res) == 'object' && !res) {
                // No value
                return null;
            }
            obj = res;
        }
//        $$.log('out out', params.value, '=', obj);
        return obj;
    }
}

$$.wikifyStringRules = [];
$$.wikifyStringRules.push({
    start: '[[',
    end: ']]',
    parser: function (result, text, item) {
        var protocols = ['http://', 'https://', 'file:///']
        var link = text;
        var linkTitle = link;
        if (-1 != link.indexOf('|')) {
            // Special link title
            link = linkTitle.substring(0, linkTitle.indexOf('|'));
            linkTitle = linkTitle.substring(linkTitle.indexOf('|')+1);
        }
        var external = false;
        for (var i = 0; i < protocols.length; i++) {
            if (link.indexOf(protocols[i]) == 0) {
                // Found
                external = true;
                break;
            };
        };
        result.push({type: 'link', content: linkTitle, link: link, external: external});
    }
}, {
    start: '((',
    end: '))',
    parser: function (result, text, item) {
        var link = text;
        var linkTitle = link;
        var delimPos = link.indexOf('|');
        if (-1 != delimPos) {
            // Special link title
            link = linkTitle.substring(0, delimPos);
            linkTitle = linkTitle.substring(delimPos+1);
        };
        result.push({type: 'embed-item', content: linkTitle, link: link});
    }
}, {
    start: "''",
    end: "''",
    parser: function (result, text, item) {
        var b = {type: 'b', children: []};
        this.wikifyString(b.children, text, item);
        result.push(b);
    }
}, {
    start: "<<",
    end: ">>",
    parser: function (result, text, item) {
        var tagDef = this.parseTagDef(text, 0, text.length);
        if (!tagDef || !this.macro[tagDef.name]) {
            $$.log('No macro', tagDef);
            var el = {type: 'err', content: 'Macro'};
            result.push(el);
            return;
        }
        var macro = this.macro[tagDef.name];
        var el = {type: 'macro', tag: tagDef};
        if (macro.parser) {
            var arr = [];
            macro.parser.call(this, arr, tagDef.params, item);
            el.children = arr;
        };
        result.push(el);
    }
}, {
    start: "!",
    end: "!",
    parser: function (result, text, item) {
        var el = {type: 'err', content: text};
        result.push(el);
    }
}, {
    start: "/",
    end: "/",
    accept: function (text, item) {
        if (text.indexOf('|') != -1) {
            // Have one more / inside
            return true;
        }
        return false;
    },
    parser: function (result, text, item) {
        var pos = text.indexOf('|');
        var rb = text.substring(0, pos);
        var rt = text.substring(pos+1);
        var el = {type: 'ruby', rb: rb, rt: rt};
        result.push(el);
    }
});
$$.renderRules = [];
$$.renderRules.push({
    type: 'p',
    render: function (value, parent, item) {
        var p = this.el('p', parent, {});
        this.renderOne(value.children, p, item);
    }
}, {
    type: 'ruby',
    render: function (value, parent, item) {
        var el = this.el('ruby', parent, {});
        this.el('rb', el, {}, value.rb);
        this.el('rt', el, {}, value.rt);
    }
}, {
    type: 'hr',
    render: function (value, parent, item) {
        this.el('hr', parent, {});
    }
}, {
    type: 'box-class',
    render: function (value, parent, item) {
        var div = this.el('div', parent, {
            'class': value.className
        });
        this.renderOne(value.children, div, item);
    }
}, {
    type: 'column',
    render: function (value, parent, item) {
        var div = this.el('div', parent, {
            'class': 'columnCell',
            'style': 'width: '+value.width+'%;'
        });
        this.renderOne(value.children, div, item);
    }
}, {
    type: 'columns',
    render: function (value, parent, item) {
        var div = this.el('div', parent, {
            'class': 'columnsTable'
        });
        var row = this.el('div', div, {
            'class': 'columnsRow'
        });
        this.renderOne(value.children, row, item);
    }
}, {
    type: 'text',
    render: function (value, parent, item) {
        this.el('span', parent, {}, value.content);
    }
}, {
    type: 'err',
    render: function (value, parent, item) {
        this.el('span', parent, {
            'class': 'err'
        }, value.content);
    }
}, {
    type: 'b',
    render: function (value, parent, item) {
        var el = this.el('b', parent, {});
        this.renderOne(value.children, el, item);
    }
}, {
    type: 'macro',
    render: function (value, parent, item) {
        var macro = this.macro[value.tag.name];
        if (!macro.render && value.children) {
            // No special renderer
            this.renderOne(value.children, parent, item);
        } else {
            if (macro.render) {
                macro.render.call(this, value.tag.params, parent, item);
            }
        }
    }
}, {
    type: 'link',
    render: function (value, parent, item) {
        if (value.external) {
            // External link
            var a = this.el('a', parent, {
                href: value.link,
                target: '_blank',
                'class': 'pageLink externalLink'
            }, value.content);
        } else {
            // Page link
            var a = this.el('a', parent, {
                href: '#'+value.link,
                'class': 'pageLink'
            }, value.content);
            a.onclick = function(event){
                this.load(value.link);
                return false;
            }.bind(this);
        }
    }
}, {
    type: 'embed-item',
    render: function (value, parent, item) {
        var visible = false;
        var span = this.el('div', parent, {
            'class': 'embedItemLink'
        }, value.content);
        var contentDiv = this.el('div', parent, {
            'class': 'embedItemContent'
        });
        contentDiv.style.display = 'none';
        span.onclick = function(event){
            if (visible) {
                contentDiv.style.display = 'none';
                visible = false;
            } else {
                var items = this.find({title: value.link});
                if (items.length == 0) {
                    $$.log('No item:', value.link);
                    return false;
                }
                var item = items[0];
                contentDiv.innerHTML = '';
                contentDiv.style.display = 'block';
                this.show(item, {parent: contentDiv, nobottom: true, notitle: true, itemClass: 'embedItem', 'static': true});
                visible = true;
            }
            return false;
        }.bind(this);
    }
}, {
    type: 'h1',
    render: function (value, parent, item) {
        var el = this.el('h1', parent, {});
        this.renderOne(value.children, el, item);
    }
}, {
    type: 'li',
    render: function (value, parent, item) {
        if (value.start) {
            parent = this.el(value.start == '#'? 'ol': 'ul', parent);
        }
        var el = this.el('li', parent, {});
        this.renderOne(value.children, el, item);
    }
}, {
    type: 'h2',
    render: function (value, parent, item) {
        var el = this.el('h2', parent, {});
        this.renderOne(value.children, el, item);
    }
}, {
    type: 'h3',
    render: function (value, parent, item) {
        var el = this.el('h3', parent, {});
        this.renderOne(value.children, el, item);
    }
}, {
    type: 'code-block',
    render: function (value, parent, item) {
        var el = this.el('pre', parent, {
            'class': 'codeBlock'
        }, value.content);
    }
});

$$.newTitle = function(title) {
    var index = 1;
    var checkTitle = ''+title;
    do {
        if (checkTitle && this.find({title: checkTitle}) == 0) {
            return checkTitle.trim();
        }
        checkTitle = ''+title+'('+(index++)+')';
    } while (true);
}

$$.macro = {};

$$.macro.removeItem = {
    render: function (value, parent, item) {
        var a = this.el('a', parent, {
            href: '#',
            'class': 'pageLink removeLink',
            'title': 'New item with: '+value.tags
        }, value.text || 'Remove');
        var items = [item];
        if (value.title || value.tags || value.tagsOp) {
            items = this.find(this.createFindConfig(value.title, value.tags, value.tagsOp));
        };
        a.addEventListener('click', function(evt) {
            var promtText = 'Remove items ['+items.length+']?';
            if (items.length == 1) {
                promtText = 'Remove item ['+items[0].title+']?'
            };
            if (confirm(promtText)) {
                for (var i = 0; i<items.length; i++) {
                    this.remove(item.title);
                }
            };
            evt.preventDefault();
            return false;
        }.bind(this));
    }
};

$$.macro.newItem = {
    render: function (value, parent, item) {
        var a = this.el('a', parent, {
            href: '#',
            'class': 'pageLink',
            'title': 'New item with: '+value.tags
        }, value.text || 'New item');
        a.onclick = function(event){
            var title = prompt('Enter new item title:');
            if (!title) {
                return false;
            }
            title = this.newTitle(title);
            // Ensure title is unique
            var err = this.update(title, title, '', value.tags);
            if (!err) {
                this.load(title);
            }
//            this.load(value.link);
            return false;
        }.bind(this);
    }
}; // Shows newItem dialog

$$.macro.openItem = {
    render: function (value, parent, item) {
        var a = this.el('a', parent, {
            href: '#'+value.title,
            'class': 'pageLink'
        }, value.text || value.title || 'Open item');
        a.onclick = function(event) {
            this.load(value.title, {tags: value.tags});
            return false;
        }.bind(this);
    }
}; // Shows newItem dialog
$$.macro.tmpl = {
    parser: function (result, params, item) {
        var tmpl = params.tmpl || '';
        var ref = params.ref;
        if (ref) {
            var items = this.find({title: ref}, null, function (items) {
                if (items.length>0) {
                    tmpl = items[0].text;
                }
            });
            var content = this.tmpl(tmpl, {item: item, params: params}, item, 'macro');
            if (params.lines) {
                var lines = content.split('\n');
                this.wikifyLines(result, lines, item);
            } else {
                this.wikifyString(result, content, item);
            }
        }
    }
}; // Inserts template
$$.macro.timeline = {
    parser: function (result, params, item) {
        var days = 180;
        var maxItems = 1000;
        if (params.days) {
            days = parseInt(params.days) || days;
        }
        if (params.max) {
            maxItems = parseInt(params.max) || maxItems;
        }
        var dateFormat = params.format || 'yyyy-mm-dd';
        var unix = new Date();
        var unixFrom = unix.getTime();
        var unixTo = new Date(unixFrom);
        unixTo.setDate(unix.getDate()-days);
        unixTo = unixTo.getTime();
        var items = this.find({
            filter: function (el) {
                var tm = parseInt(el.getAttribute('data-edited'));
                if (tm>unixTo && tm<unixFrom) {
                    return true;
                }
                return false;
            },
            sort: function(a, b) {
                if (!a.edited || !b.edited) return 0;
                return b.edited.getTime()-a.edited.getTime();
            }
        });
        var content = [];
        var title = '';
//        $$.log('timeline parser', params, items.length);
        for (var i = 0; i<Math.min(items.length, maxItems); i++) {
            var itm = items[i];
            var t = itm.edited.format(dateFormat);
            if (t != title) {
                title = t;
                content.push('!!! '+t);
            };
            content.push('[['+itm.title+']]');
            content.push('');
        }
        this.wikifyLines(result, content, item);
    }
};
$$.renderOne = function(children, parent, item) {
    for (var i = 0; i<children.length; i++) {
        var value = children[i];
        var found = false;
        for (var j = 0; j<this.renderRules.length; j++) {
            var r = this.renderRules[j];
            if (value.type == r.type) {
                r.render.call(this, value, parent, item);
                found = true;
                break;
            }
        }
        if (!found) {
            this.log('!!! Not found:', value);
        }
    };
};

$$.wikifyString = function(result, text, item, start) {
    if (!text) {
        return;
    }
    var addToResult = function (arr) {
        for (var i = 0; i<arr.length; i++) {
            result.push(arr[i]);
        };
    };
    for (var idx = (start || 0); idx<this.wikifyStringRules.length; idx++) {
        var rule = this.wikifyStringRules[idx];
        var i = text.indexOf(rule.start);
        if(-1 != i) { // Have link
            var end = text.indexOf(rule.end, i+1+rule.start.length);
            if (-1 != end) {
                // Found link
                var content = text.substring(i+rule.start.length, end);
                if (rule.accept && !rule.accept.call(this, content, item)) {
                    continue;
                }
                this.wikifyString(result, text.substring(0, i), item, idx+1);
                rule.parser.call(this, result, content, item);
                this.wikifyString(result, text.substring(end+rule.end.length), item);
                return;
            }
        }
    };
    result.push({type: 'text', content: text});
};

$$.skipBlock = function (lines, from, start, end) {
    var isLine = function(line, patt) {
        if (typeof(patt) == 'string') {
            return line == patt;
        }
        if (!patt) {
            return false;
        }
        if (patt.exec) {
            return patt.exec(line) ? true: false;
        }
        return false;
    }
    var deep = 1;
    for (var i = from; i<lines.length; i++) {
        var line = lines[i];
        if (isLine(line, start)) {
            deep++;
            continue;
        }
        if (isLine(line, end)) {
            deep--;
            if (deep == 0) {
                return i;
            }
            continue;
        }
    }
    return -1;
};

$$.classBlockReg = /^@@(.+)$/;

$$.wikifyLines = function(result, lines, item) {
    var p = {type: 'p', children: []};
    result.push(p);
    var stack = [];
    for (var index = 0; index<lines.length; index++) {
        var line = lines[index].trim();
        if (!line) {
            // Paragraph
            p = {type: 'p', children: []};
            result.push(p);
            stack = [];
            continue;
        };
        if ('---' == line) {
            p.children.push({type: 'hr'});
            continue;
        }
        var m = this.classBlockReg.exec(line);
        if (m) {
            var className = m[1];
            var endBlock = this.skipBlock(lines, index+1, this.classBlockReg, '@@');
            if (endBlock != -1) {
                var blockLines = [];
                for (var i = index+1; i<endBlock; i++) {
                    blockLines.push(lines[i]);
                }
                var box = {type: 'box-class', className: className, children: []};
                this.wikifyLines(box.children, blockLines, item);
                p.children.push(box);
                index = endBlock;
                continue;
            }
        }
        if ('||' == line) {
            var endBlock = this.skipBlock(lines, index+1, null, '||');
            if (endBlock != -1) {
                var blockLines = [];
                var blocks = [];
                for (var i = index+1; i<endBlock; i++) {
                    if ('|' == lines[i]) {
                        blocks.push(blockLines);
                        blockLines = [];
                        continue;
                    }
                    blockLines.push(lines[i]);
                }
                if (blockLines.length>0) {
                    blocks.push(blockLines);
                }
                var box = {type: 'columns', className: className, children: []};
                var width = 0;
                if (blocks.length>0) {
                    width = Math.floor(100 / blocks.length);
                }
                for (var i = 0; i<blocks.length; i++) {
                    var cell = {type: 'column', children: [], width: width};
                    box.children.push(cell);
                    this.wikifyLines(cell.children, blocks[i], item);

                }
                p.children.push(box);
                index = endBlock;
                continue;
            }
        }
        if ('{{{' == line) {
            // Code block
            var found = false;
            for (var i = index+1; i<lines.length; i++) {
                if (lines[i] == '}}}') {
                    // Create pre block
                    var content = '';
                    for (var j = index+1; j<i; j++) {
                        content += lines[j]+'\n';
                    };
                    p.children.push({type: 'code-block', content: content});
                    index += i+1;
                    found = true;
                    break;
                };
            };
            if (found) {
                stack = [];
                continue;
            }
        }
        this.wikifyLine(p.children, line, item, stack);
    };
}

$$.wikifyLine = function(result, line, item, stack) {
    var box = null;
    var container = result;
    var string = '';
    var clearStack = true;
    if (line.startsWith('! ')){
        box = {type: 'h1', children: []};
        string = line.substring(2);
    }
    if (line.startsWith('!! ')){
        box = {type: 'h2', children: []};
        string = line.substring(3);
    }
    if (line.startsWith('!!! ')){
        box = {type: 'h3', children: []};
        string = line.substring(4);
    }
    if (line.startsWith('*') || line.startsWith('#')) {
        clearStack = false;
        var spacePos = line.indexOf(' ');
        if (spacePos>0) {
            string = line.substring(spacePos+1);
            // Have some combination of *#
            var chars = line.substr(0, spacePos);
            while(chars.length<stack.length) {
                stack.pop();
            };
            if (chars.length == stack.length) {
                // Same level
                if (chars == stack[stack.length-1].chars) {
                    // OK, same level, same marker
                    container = stack[stack.length-1].container;
                    box = {type: 'li', children: []};
                } else {
                    // Chars different - one try - pop from stack
                    stack.pop();
                }
            }
            if (chars.length == stack.length+1) {
                // New level
                if (stack.length>0 && chars.substr(0, chars.length-1) != stack[stack.length-1].chars) {
                    // Stack have items and parent is wrong
                    clearStack = true;
                } else {
                    if (stack.length>0) {
                        container = stack[stack.length-1].container;
                    }
                    // New level
                    box = {type: 'li', children: [], start: chars.charAt(chars.length-1)};
                    stack.push({box: box, chars: chars, container: box.children}); // Put new level
                }
            }
        } else {
            clearStack = true; // No space - invalid list
        }
    }
    if (clearStack) {
        while (stack.length>0) {
            stack.pop();
        }
    }
    if (box) {
        container.push(box);
        this.wikifyString(box.children, string, item);
    } else {
        this.wikifyString(container, line+' ', item);
    }
};

$$.wikify = function(text, item, options) {
    var lines = text.split('\n');
    var result = [];
    $$.wikifyLines(result, lines, item);
    var root = document.createElement('div');
    this.renderOne(result, root, item);
    return root;
};

$$.edit = function(item, options) {
    if (options) {
        options = {};
    };
    var div;
    var nl = this.itemsRoot.querySelectorAll('div[data-title="'+item.title+'"][data-role="edit"]');
    if (nl.length>0) {
        div = nl[0];
    } else { // Create editor
        div = this.el('div', null, {
            'class': 'itemEditor',
            'data-role': 'edit',
            'data-title': item.title
        });
        var wrap = this.el('div', div, {
            'class': 'inputWrap'
        });
        this.el('label', wrap, {}, 'Title');
        var titleEdit = this.el('input', wrap, {
            'data-editor': 'title',
            'class': 'input',
            type: 'text'
        });
        if (!this.titleEditable(item)) {
            titleEdit.setAttribute('readonly', 'true');
        }
        titleEdit.addEventListener('keypress', function (evt) {
            if (evt.which == 13) {
                saveHandler();
                return false;
            }
            return true;
        }.bind(this));
        wrap = this.el('div', div, {
            'class': 'inputWrap'
        });
        this.el('label', wrap, {}, 'Content');
        var contentEdit = this.el('textarea', wrap, {
            'data-editor': 'content',
            'class': 'inputArea'
        });
        contentEdit.addEventListener('keypress', function (evt) {
            if (evt.which == 13 && evt.ctrlKey) {
                saveHandler();
                return false;
            }
            return true;
        }.bind(this));
        wrap = this.el('div', div, {
            'class': 'inputWrap'
        });
        this.el('label', wrap, {}, 'Tags');
        var tagsEdit = this.el('input', wrap, {
            'data-editor': 'tags',
            'class': 'input',
            type: 'text'
        });
        tagsEdit.addEventListener('keypress', function (evt) {
            if (evt.which == 13) {
                saveHandler();
                return false;
            }
            return true;
        }.bind(this));
        wrap = this.el('div', div, {
            'class': 'inputWrap'
        });
        var saveButton = this.el('button', wrap, {
            'data-editor': 'save',
            'class': 'editButton'
        }, 'Save');
        var saveHandler = function() {
            var title = titleEdit.value;
            var content = contentEdit.value;
            var tags = tagsEdit.value;
            var err = this.update(item.title, title, content, tags);
//            $$.log('Save', title, content, tags, err);
            if (!err) {
                div.parentNode.removeChild(div);
            };
        }.bind(this);
        saveButton.onclick = saveHandler;
        var cancelButton = this.el('button', wrap, {
            'data-editor': 'cancel',
            'class': 'editButton'
        }, 'Cancel');
        nl = this.itemsRoot.querySelectorAll('div[data-title="'+item.title+'"][data-role="show"]');
        if (nl.length>0 && nl[0].nextSibling) {
            this.itemsRoot.insertBefore(div, nl[0].nextSibling);
        } else {
            // Append to end
            this.itemsRoot.appendChild(div);
        }
        titleEdit.value = item.title;
        contentEdit.value = item.text || '';
        tagsEdit.value = item.tags.join(' ');
        cancelButton.onclick = function (event) {
            div.parentNode.removeChild(div);
        }.bind(this);
    };
    this.scrollToEl(div);
    var areas = div.querySelectorAll('textarea');
    if (areas.length>0) {
        areas[0].focus();
        areas[0].select();
    }
};

$$.systemPlugins = ['systemStyle', 'systemTemplate', 'systemPlugin'];

$$.titleEditable = function(item, options) {
    if (item.hasTag(this.systemPlugins)) {
        return false;
    }
    return true;
}

$$.fillTemplate = function(item, options) {
    if (item.hasTag(this.systemPlugins)) {
        options.templateRef = 'SystemTemplate';
    }
};

$$.close = function(item) {
    var nl = this.itemsRoot.querySelectorAll('div[data-title="'+item.title+'"][data-role="show"]');
    for (var i = 0; i<nl.length; i++) {
        nl[i].parentNode.removeChild(nl[i]);
    };
    this.events.emit('close', {title: item.title});
    this.events.emit('hide', {title: item.title});
};

$$.render = function(item, div, options) {
    this.fillTemplate(item, options);
    var tmpl = '';
    if (options.template) {
        tmpl = options.template;
    }
    var doRender = function () {
        if (options['static']) {
            item['static'] = true; // Don't subscribe to events
        }
        item.renderOptions = options;
        div.innerHTML = '';
        div.setAttribute('data-title', item.title);
        div.setAttribute('data-role', 'show');
        div.ondblclick = function (event) {
            $$.edit(item);
            event.stopPropagation();
        }.bind(this);
        if (!options.notitle) {
            var titleDiv = document.createElement('div');
            titleDiv.className = 'itemTitle';
            titleDiv.appendChild(document.createTextNode(item.title));
            var titleButtons = document.createElement('div');
            titleButtons.className = 'itemTitleButtons';
            var editButton = this.el('button', titleButtons, {
                'class': 'titleButton'
            }, 'Edit');
            editButton.onclick = function(event) {
                $$.edit(item);
            }.bind(this);
            var removeButton = this.el('button', titleButtons, {
                'class': 'titleButton'
            }, 'Remove');
            removeButton.onclick = function(event) {
                if (confirm('Remove item ['+item.title+']?')) {
                    this.remove(item.title);
                }
            }.bind(this);
            var closeButton = this.el('button', titleButtons, {
                'class': 'titleButton'
            }, 'Close');
            closeButton.onclick = function(event){
                this.close(item);
            }.bind(this);
            div.appendChild(titleDiv);
            div.appendChild(titleButtons);
        }
        var contentDiv = document.createElement('div');
        contentDiv.className = 'itemContent';
        var text = item.text;
        if (tmpl) {
            text = this.tmpl(tmpl, {
                item: item,
                options: options
            }, item, 'template itself');
        }
        contentDiv.appendChild(this.wikify(text || '', item, options));
        div.appendChild(contentDiv);
        if (!options.nobottom) {
            var bottomDiv = this.el('div', div, {
                'class': 'itemBottom'
            });
            var times = '';
            if (item.created) {
                times +=''+(new Date(item.created).format(this.shortDateTime));
            }
            if (item.edited) {
                times +=' '+(new Date(item.edited).format(this.shortDateTime));
            }
            this.el('div', bottomDiv, {
                'class': 'itemTimes'
            }, times);
            var tagsDiv = this.el('div', bottomDiv, {
                'class': 'itemTags'
            });
            if (item.tags) {
                // Render tags
                for (var i = 0; i<item.tags.length; i++) {
                    var tag = item.tags[i];
                    this.renderTag(item, tag, tagsDiv);
                }
            }
            this.el('div', bottomDiv, {style: 'clear: both;'});
        }        
    }.bind(this);
    if (options.templateRef) {
        // Search for templateRef
        var arr = this.find({title: options.templateRef}, null, function (arr) {
            if (arr.length>0) {
                tmpl = arr[0].text;
            }
            doRender();
        }.bind(this));
    } else {
        doRender();
    }
};

$$.formatTag = function(tag, item) {
    if (tag.startsWith('[') && tag.endsWith(']')) {
        return tag.substr(1, tag.length-2);
    }
    return tag;
}

$$.tagClick = function(item, tag, tagCaption, div) {
    this.load("Tagged by '"+tagCaption+"'", {
        templateRef: 'ByTagTemplate',
        tag: tag
    });

}

$$.renderTag = function(item, tag, parent) {
    var tagCaption = this.formatTag(tag, item);
    if (!tagCaption) { // No caption - no tag
        return;
    }
    var div = this.el('div', parent, {
        'class': 'itemTag'
    }, tagCaption);
    div.addEventListener('click', function() {
        this.tagClick(item, tag, tagCaption, div);
        return false;
    }.bind(this));
}

$$.show = function(item, options) {
    var div = document.createElement('div');
    div.className = options.itemClass || 'item';
    (options.parent || this.itemsRoot).appendChild(div);
    this.render(item, div, options);
};

$$.load = function(title, options) {
    if (!options) options = {};
    var items = this.find({
        title: title
    }, null, function (items) {
        options.navigate = true;
        if (items.length>0) {
            // Existing item
            this.open(items[0], options);
        } else { // New items
            if (options.nocreate) {
                // Don't create new
                return;
            }
            var item = new this.itemPrototype();
            item.title = title;
            item.text = 'No content';
            item.tags = this.parseTags(options.tags);
            this.open(item, options);
        };
    }.bind(this));
};

$$.open = function(item, options) {
    if (!options) {
        options = {};
    }
    var nl = this.itemsRoot.querySelectorAll('div[data-title="'+(options.replaces || item.title)+'"][data-role="show"]');
    if (nl.length>0 && !options.parent) {
        // Already shown - send 'hide' event
        this.events.emit('hide', {title: item.title}); // Old title
        // Re-render?
        this.render(item, nl[0], options);
        if (options.navigate) {
            // Need to focus
            this.navigate(item);
        };
        return;
    };
    // Show
    // this.events.emit('show', {title: item.title, item: item}); // Item is shown
    this.show(item, options);
    if (options.navigate) {
        // Need to focus
        this.navigate(item);
    };
};

$$.showStartup = function() {
    $$.find({
        tags: 'startup'
    }, function(item) {
        this.open(item);
    }.bind(this));
    if (window.location.hash) {
        $$.load(window.location.hash.substring(1), {nocreate: true});
    }
};

$$.events.on('start', function() {
    $$.initUI();
    $$.showStartup();
});

$$.events.on('updated', function(evt) {
    if (evt.err) {
        this.addMessage(evt.err, {err: true});
    }
});

$$.pluginLoaded('CorePlugin');