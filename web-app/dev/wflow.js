(function($$) {

$$.startWorkFlow = function() {

};
var EVENT_TAG = 'Event';
var ACTION_TAG = 'Action';
var PROJECT_TAG = 'Project';
var CONTACT_TAG = 'Contact';
var REFERENCE_TAG = 'Ref';
var DONE_TAG = 'Done';
var DAILY_TAG = 'Daily';
var WEEKLY_TAG = 'Weekly';
var STAR_TAG = 'Star';
var DONEABLE = [EVENT_TAG, ACTION_TAG, PROJECT_TAG];
var HIDDEN = [EVENT_TAG, ACTION_TAG, PROJECT_TAG, REFERENCE_TAG, DONE_TAG, CONTACT_TAG, STAR_TAG];
$$.events.on('start', function() {
    this.startWorkFlow();
}.bind($$));


$$.events.on('change', function(evt) {
    var isType = function(type) {
        return evt.item.tags.indexOf(type) != -1;
    }
    if (evt.remove) {
        var removeAll = function (tag) {
            var items = this.find({tags: [tag, evt.item.normalizeTag(evt.title)]}, null, function (items) {
                for (var i = 0; i<items.length; i++) {
                    this.remove(items[i].title);
                }
            }.bind(this));
        }.bind(this);
        var clearAll = function (tag) {
            var nameTag = evt.item.normalizeTag(evt.title);
            var items = this.find({tags: [tag, nameTag]}, null, function (items) {
                for (var i = 0; i<items.length; i++) {
                    if (items[i].editTag([nameTag])){
                        this.update(items[i].title, null, null, items[i].tags);
                    }
                }
            }.bind(this));
        }.bind(this);
        if (isType(PROJECT_TAG)) {
            removeAll(PROJECT_TAG);
            removeAll(REFERENCE_TAG);
            removeAll(ACTION_TAG);
            removeAll(EVENT_TAG);
        }
        if (isType(CONTACT_TAG)) {
            clearAll(PROJECT_TAG);
            clearAll(ACTION_TAG);
            clearAll(EVENT_TAG);
        }
        if (isType(ACTION_TAG)) {
            removeAll(ACTION_TAG);
        }
        if (isType(REFERENCE_TAG)) {
            removeAll(REFERENCE_TAG);
        }
    }
    if (evt.edit) {
        if (evt.tags && evt.tags.indexOf(DONE_TAG) == -1 && evt.item.tags.indexOf(DONE_TAG) != -1) {
            // Tags modified and changed from not done to done - add timestamp
            var item = evt.item;
            if (item.editTag([/^at:[\d-]{10}/], ['at:'+(new Date().format('yyyy-mm-dd'))])) {
                this.update(item.title, null, null, item.tags);
            }
        }
        if (evt.title && evt.item.title != evt.title) {
            var rename = function (from, to, types) {
                for (var i = 0; i<types.length; i++) {
                    var type = types[i];
                    var items = this.find({tags: [from, type]});
                    for (var j = 0; j<items.length; j++) {
                        var item = items[j];
                        var changeResult = item.editTag([from], [to]);
                        if (changeResult) {
                            this.update(item.title, null, null, item.tags);
                        }
                    }
                }
            }.bind(this);
            var from = evt.title;
            var to = evt.item.title;
            if (isType(PROJECT_TAG)) {
                rename(from, to, [PROJECT_TAG, REFERENCE_TAG, ACTION_TAG, EVENT_TAG]);
            }
            if (isType(CONTACT_TAG)) {
                rename(from, to, [PROJECT_TAG, ACTION_TAG, EVENT_TAG]);
            }
            if (isType(ACTION_TAG)) {
                rename(from, to, [ACTION_TAG]);
            }
            if (isType(REFERENCE_TAG)) {
                rename(from, to, [REFERENCE_TAG]);
            }
        }
    }
}.bind($$));

$$.renderDateSelector = function (parent, item) {
    var dt = this.getDateTag(item);
    var div = this.el('div', parent, {'class': 'dateSelectorRoot'});
    var addLink = function(dt, caption, method, value) {
        var link = this.el('a', div, {'class': 'dateSelectorLink', href: '#'}, caption);
        link.addEventListener('click', function(evt){
            if (!dt) {
                dt = new Date();
            };
            dt['set'+method].call(dt, dt['get'+method].call(dt)+value);
            if (item.editTag([/^at:[\d-]{10}/], ['at:'+(dt.format('yyyy-mm-dd'))])) {
                this.update(item.title, null, null, item.tags);
            }
            evt.preventDefault();
            return false;
        }.bind(this));
    }.bind(this);
    addLink(dt, '-y', 'FullYear', -1);
    addLink(dt, '-m', 'Month', -1);
    addLink(dt, '-w', 'Date', -7);
    addLink(dt, '-d', 'Date', -1);
    var dateDiv = this.el('div', div, {'class': 'dateSelectorDate'}, dt? dt.format('yy/m/d, ddd'): 'No date');
    addLink(dt, '+d', 'Date', 1);
    addLink(dt, '+w', 'Date', 7);
    addLink(dt, '+m', 'Month', 1);
    addLink(dt, '+y', 'FullYear', 1);
}

$$.override('tagClick', function (sup, item, tag, tagCaption, div) {
    var dt = this.getDateTag(item, tag);
    if (!dt) {
        return sup.asis();
    }
    var dtDiv = div.parentNode.querySelectorAll('div.dateSelectorRootTag')[0];
    if (dtDiv) {
        dtDiv.parentNode.removeChild(dtDiv);
        return null;
    }
    dtDiv = this.el('div', div.parentNode, {'class': 'dateSelectorRootTag'});
    this.renderDateSelector(dtDiv, item);
    return null;
});

$$.macro.dateSelector = {
    render: function (value, parent, item) {
        var editItem = item;
        if (value.title) {
            // Toggle other item
            editItem = this.find({title: value.title})[0];
            if (!editItem) {
                $$.log('No item for toggle');
                return;
            }
        }
        this.renderDateSelector(parent, editItem);
    }
}

$$.macro.multiToggle = {
    render: function (value, parent, item) {
        var editItem = item;
        if (value.title) {
            // Toggle other item
            editItem = this.find({title: value.title})[0];
            if (!editItem) {
                $$.log('No item for toggle');
                return;
            }
        }
        var tags = this.parseTags(value.tags);
        var captions = this.parseTags(value.captions);
        var colors = this.parseTags(value.colors);
//        $$.log('mt', tags, captions, colors);
        if (tags.length != captions.length) {
            captions = tags;
        }
        var remove = [];
        var expanded = false;
        var clickHandler = function (evt) {
            if (!expanded) {
                // First click - expand hidden entries
                wrap.className = 'multiToggle multiToggleVisible'
                expanded = true;
                return false;
            };
            var tag = evt.target.getAttribute('data-tag');
            var add = [];
            if (tag) {
                add.push(tag);
            }
            $$.log('Edit', editItem.tags, remove, add);
            if (!editItem.editTag(remove, add)) {
                return false;
            }
            this.update(editItem.title, null, null, editItem.tags);
            return false;
        }.bind(this);
        var wrap = this.el('div', parent, {
            'class': 'multiToggle'
        });
        for (var i = 0; i<tags.length; i++){
            var style = null;
            if (tags.length == colors.length) {
                style = 'color: '+colors[i]+'; border-color: '+colors[i]+';';
            }
            var div = this.el('div', wrap, {
                'class': 'multiToggleItem',
                'data-tag': tags[i],
                'style': style
            }, captions[i]);
            var disabled = false;
            if (tags[i] == '') {
                if (editItem.hasTag(tags)) {
                    disabled = true;
                }
            } else {
                remove.push(tags[i]);
                if (!editItem.hasTag(tags[i])) {
                    disabled = true;
                }
            }
            if (disabled) {
                div.className += ' multiToggleItemDisabled';
            }
            div.addEventListener('click', clickHandler);
        }
    }
};

$$.macro.tagSelector = {
    render: function (value, parent, item) {
        var options = [];
        options.push('-'); // No tag
        var tags = [];
        var exclude = this.parseTags(value.exclude);
        this.find(this.createFindConfig(null, value.tags, value.tagsOp, value.sort || '*title*'), null, function (items) {
            for (var i = 0; i<items.length; i++) {
                var title = items[i].normalizeTag(items[i].title);
                if (-1 != exclude.indexOf(title)) {
                    continue;
                }
                tags.push(title);
                options.push(items[i].title);
            }
            var div = this.el('div', parent, {
                'class': 'selectorBox'
            });
            this.el('div', div, {
                'class': 'selectorTitle'
            }, value.title || 'No title');
            var select = this.el('select', div, {
                'class': 'selectorSelect'
            });
            for (var i = 0; i<options.length; i++) {
                this.el('option', select, {}, options[i]);
            }
            var tagIndex = -1;
            for (var i = 0; i<tags.length; i++) {
                var index = item.tags.indexOf(tags[i]);
                if (-1 != index) {
                    tagIndex = i;
                    break;
                }
            }
    //        $$.log('tagSelector', value.title, options, tags, tagIndex, item.tags);
            if (tagIndex == -1) {
                select.selectedIndex = 0;
            } else {
                select.selectedIndex = tagIndex+1;
                var a = this.el('a', div, {
                    href: '#'+options[tagIndex+1],
                    'class': 'pageLink'
                }, '>>');
                a.addEventListener('click', function() {
                    this.load(options[tagIndex+1]);
                }.bind(this));
            }
            select.addEventListener('change', function() {
                var sel = select.selectedIndex || 0;
    //            $$.log('Selected: ', select.value, sel, item);
                if (item.editTag(tags, sel == 0? null: [options[sel]])) {
                    this.update(item.title, null, null, item.tags);
                }
            }.bind(this));
        }.bind(this));
    }
};

$$.macro.toggle = {
    render: function (value, parent, item) {
        var add = [];
        var remove = [];
        var title = value.title;
        var editItem = item;
        if (value.title) {
            // Toggle other item
            editItem = this.find({title: value.title})[0];
            if (!editItem) {
                $$.log('No item for toggle');
                return;
            }
        }
        var tags = this.parseTags(value.toggle);
        for (var i = 0; i<tags.length; i++) {
            var t = tags[i];
            if (t.startsWith('+')) {
                add.push(t.substr(1));
            }
            if (t.startsWith('-')) {
                remove.push(t.substr(1));
            }
        }
        if (value.onRender) {
            // Will render as anchor
            var el = this.el('a', parent, {
                'href': '#'
            });
            value.onRender(el, value.value);
            el.onclick = function(event){
                // $$.log('Checkbox', el.checked, editItem, remove, add, tags, value.value);
                var changed = value.value? editItem.editTag(add, remove): editItem.editTag(remove, add);
                // $$.log('Checkbox', changed, editItem.tags);
                if (!changed) {
                    return false;
                }
                var err = this.update(editItem.title, null, null, editItem.tags);
                return false;
            }.bind(this);
            return;
        }
        var el = this.el('input', parent, {
            'type': 'checkbox',
            'class': 'toggleCheckbox',
            'value': 'toggle',
            'checked': value.value? 'true': ''
        });
        el.onchange = function(event){
//            $$.log('Checkbox', el.checked, editItem, remove, add, tags);
            var changed = el.checked? editItem.editTag(remove, add): editItem.editTag(add, remove);
//            $$.log('Checkbox', changed, editItem.tags);
            if (!changed) {
                return true;
            }
            var err = this.update(editItem.title, null, null, editItem.tags);
            return true;
        }.bind(this);
    }

};
$$.macro.star = {
    render: function (value, parent, item) {
        if (!value.toggle) {
            // Default - toggle Star tag
            value.toggle="+"+STAR_TAG
        };
        value.onRender = function (anchor, value) {
            if (value) {
                // Checked
                anchor.className = 'star starOn';
                anchor.appendChild(document.createTextNode('★'));
            } else {
                // Not checked
                anchor.className = 'star starOff';
                anchor.appendChild(document.createTextNode('☆'));
            }
        }.bind(this);
        return this.macro.toggle.render.call(this, value, parent, item);
    }
};
$$.override('formatTag', function (sup, tag, item) {
    if (tag.startsWith('at:')) {
        var dt = new Date(tag.substr(3));
        if (dt) {
            return dt.format(this.shortDate);
        }
        return tag;
    }
    if (-1 != HIDDEN.indexOf(tag)) {
        return '';
    }
    return sup.asis();
});

$$.getDateTag = function (item, tag) {
    var atTag = item.hasTag([/^at:[\d|-]+/]);
    var dt = null;
    if (atTag && (!tag || tag == atTag)) {
        dt = new Date(atTag.substr(3));
    }
    return dt;
}

$$.override('fillTemplate', function(sup, item, options) {
    if (item.hasTag(DAILY_TAG)) {
        var dt = this.getDateTag(item);
        if (dt) {
            options.templateRef = 'DailyTemplate';
            options.date = dt;
        }
    }
    if (item.hasTag(ACTION_TAG)) {
        options.templateRef = 'ActionTemplate';
    }
    if (item.hasTag(CONTACT_TAG)) {
        options.templateRef = 'ContactTemplate';
    }
    if (item.hasTag(PROJECT_TAG)) {
        options.templateRef = 'ProjectTemplate';
    }
    if (item.hasTag(REFERENCE_TAG)) {
        options.templateRef = 'RefTemplate';
    }
    if (item.hasTag(EVENT_TAG)) {
        options.templateRef = 'EventTemplate';
    }
    return sup.asis();
});

$$.pluginLoaded('WorkFlowPlugin');

}).call($$, $$);