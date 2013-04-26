// Generated by CoffeeScript 1.6.2
(function() {
  var WindowHandler, WindowProvider, log, test,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  yepnope({
    load: ['lib/zepto.min.js', 'lib/zepto/touch.js', 'css/tango3.css'],
    complete: function() {
      return $(document).ready(function() {
        return test();
      });
    }
  });

  log = function() {
    var arr, item, _i, _len;

    arr = [];
    for (_i = 0, _len = arguments.length; _i < _len; _i++) {
      item = arguments[_i];
      arr.push(item);
    }
    return console.log.apply(console, arr);
  };

  test = function() {
    var TestProvider, div, provider, win;

    TestProvider = (function(_super) {
      __extends(TestProvider, _super);

      function TestProvider() {
        var i, _i;

        this.lines = [];
        for (i = _i = 0; _i < 50; i = ++_i) {
          this.lines.push("Line no " + i);
        }
      }

      TestProvider.prototype.colorize = function(index) {
        var result, text;

        result = [];
        text = this.get(index);
        if (text.indexOf('no') !== -1) {
          result.push([text.indexOf('no'), 2, 'text0']);
        }
        if (text.indexOf('xxx') !== -1) {
          result.push([text.indexOf('xxx'), 3, 'text1']);
        }
        return result;
      };

      TestProvider.prototype.size = function() {
        return this.lines.length;
      };

      TestProvider.prototype.get = function(index) {
        return this.lines[index];
      };

      TestProvider.prototype.editable = function(index, column) {
        return true;
      };

      TestProvider.prototype.edit = function(index, text) {
        return this.lines[index] = text;
      };

      TestProvider.prototype.lineBreak = function(index, text, pos) {
        this.lines[index] = text.substr(0, pos);
        this.lines.splice(index + 1, 0, text.substr(pos));
        return [index + 1, 0];
      };

      TestProvider.prototype.backSpace = function(index, text) {
        var prevLength;

        if (index === 0) {
          return [0, 0];
        }
        prevLength = this.lines[index - 1].length;
        this.lines[index - 1] = this.lines[index - 1] + text;
        this.lines.splice(index, 1);
        return [index - 1, prevLength];
      };

      return TestProvider;

    })(WindowProvider);
    provider = new TestProvider();
    win = new WindowHandler();
    div = $(document.createElement('div')).attr('id', 'testWin');
    div.appendTo(document.body);
    div.append(win.init(provider));
    log('Win created');
    return setTimeout(function() {
      return win.refresh();
    }, 100);
  };

  WindowProvider = (function() {
    function WindowProvider() {}

    WindowProvider.prototype.size = function() {
      return 0;
    };

    WindowProvider.prototype.get = function(index) {
      return '';
    };

    WindowProvider.prototype.editable = function(index, column) {
      return false;
    };

    WindowProvider.prototype.edit = function(index, text) {};

    WindowProvider.prototype.lineBreak = function(index, text, pos) {
      return [index, pos];
    };

    WindowProvider.prototype.backSpace = function(index, text) {
      return [index, 0];
    };

    WindowProvider.prototype.colorize = function(index) {
      return [];
    };

    return WindowProvider;

  })();

  WindowHandler = (function() {
    function WindowHandler() {}

    WindowHandler.prototype.init = function(provider) {
      var div,
        _this = this;

      this.provider = provider;
      this.from = 0;
      this.selected = -1;
      this.cursorRow = 0;
      div = $(document.createElement('div')).addClass('win root');
      this.lines = $(document.createElement('div')).addClass('win lines').appendTo(div);
      this.scroll = $(document.createElement('div')).addClass('win scroll').appendTo(div);
      this.char = $(document.createElement('div')).addClass('win char hidden').appendTo(div);
      this.char.text('0');
      this.lineDivs = [];
      this.lines.on('swipeUp', function() {
        _this.pg(_this.selected - _this.from, false);
        return false;
      });
      this.lines.on('swipeDown ', function() {
        _this.pg(_this.selected - _this.from, true);
        return false;
      });
      return div;
    };

    WindowHandler.prototype.moveCursor = function(div, text, pos) {
      var range, selection;

      range = document.createRange();
      if (pos < text.length) {
        range.setStart(div.childNodes[0], pos);
        range.collapse(true);
      } else {
        range.selectNodeContents(div);
        range.collapse(false);
      }
      selection = window.getSelection();
      selection.removeAllRanges();
      return selection.addRange(range);
    };

    WindowHandler.prototype.colorize = function(div, text, spans) {
      var end, i, item, res, ritem, span, _i, _j, _k, _len, _len1, _len2, _results;

      res = [[0, text.length]];
      for (_i = 0, _len = spans.length; _i < _len; _i++) {
        span = spans[_i];
        if (span[0] >= 0 && span[1] > 0 && span[0] + span[1] <= text.length) {
          for (i = _j = 0, _len1 = res.length; _j < _len1; i = ++_j) {
            item = res[i];
            if (item[0] + item[1] <= span[0]) {
              continue;
            }
            if (item[0] < span[0] && item[0] + item[1] > span[0] + span[1]) {
              ritem = [span[0] + span[1]];
              ritem[1] = item[0] + item[1] - ritem[0];
              ritem[2] = item[2];
              item[1] = span[0] - item[0];
              res.splice(i + 1, 0, span, ritem);
              break;
            }
            if (item[0] >= span[0] && item[0] + item[1] <= span[0] + span[1]) {
              res.splice(i, 1);
              i = i - 1;
              continue;
            }
            if (item[0] >= span[0]) {
              res.splice(i, 0, span);
              end = item[0] + item[1];
              item[0] = span[0] + span[1];
              item[1] = end - item[0];
            } else {
              item[1] = span[0] - item[0];
              res.splice(i + 1, 0, span);
            }
            i = i + 1;
          }
        }
      }
      div.empty();
      _results = [];
      for (_k = 0, _len2 = res.length; _k < _len2; _k++) {
        item = res[_k];
        span = $(document.createElement('span'));
        span.text(text.substr(item[0], item[1]));
        if (item[2]) {
          span.addClass('th_' + item[2]);
        }
        _results.push(div.append(span));
      }
      return _results;
    };

    WindowHandler.prototype.editLine = function(index, reason) {
      var div, text;

      div = this.lineDivs[index];
      div.addClass('line_edit');
      this.selected = this.from + index;
      if (this.provider.editable(this.selected, this.cursorRow)) {
        text = this.provider.get(this.selected);
        div.text(text);
        this.edit = true;
        div.attr('contentEditable', true);
        if (this.cursorRow >= 0) {
          this.moveCursor(div.get(0), text, this.cursorRow);
        }
      }
      return div.focus();
    };

    WindowHandler.prototype.cursorPos = function(div) {
      var charCount, range, treeWalker;

      if (window.getSelection().rangeCount === 0) {
        return -1;
      }
      range = window.getSelection().getRangeAt(0);
      treeWalker = document.createTreeWalker(div.get(0), NodeFilter.SHOW_TEXT, function(node) {
        var nodeRange;

        nodeRange = document.createRange();
        nodeRange.selectNodeContents(node);
        if (nodeRange.compareBoundaryPoints(Range.END_TO_END, range) < 1) {
          return NodeFilter.FILTER_ACCEPT;
        } else {
          return NodeFilter.FILTER_REJECT;
        }
      }, false);
      charCount = 0;
      while (treeWalker.nextNode()) {
        charCount = charCount + treeWalker.currentNode.length;
      }
      if (range.startContainer.nodeType === 3) {
        charCount = range.startOffset;
      }
      return charCount;
    };

    WindowHandler.prototype.finishEdit = function(index, reason) {
      var div, pos, text;

      if (reason == null) {
        reason = 'none';
      }
      div = this.lineDivs[index];
      pos = this.cursorPos(div);
      if (this.edit && pos >= 0) {
        this.cursorRow = pos;
      }
      div.removeClass('line_edit');
      if (this.edit) {
        text = div.text();
        this.provider.edit(this.from + index, text);
        div.attr('contentEditable', false);
        this.renderLine(this.from + index, index);
      }
      return this.edit = false;
    };

    WindowHandler.prototype.renderLine = function(index, lineIndex) {
      var colors, div, text;

      div = this.lineDivs[lineIndex];
      div.attr('class', 'win char line');
      if (index < this.provider.size()) {
        text = this.provider.get(index);
        colors = this.provider.colorize(index);
        return this.colorize(div, text, colors);
      } else {
        return div.text('');
      }
    };

    WindowHandler.prototype.backSpace = function(index) {
      var div, text, _ref;

      div = this.lineDivs[index];
      text = div.text();
      _ref = this.provider.backSpace(this.from + index, text), this.selected = _ref[0], this.cursorRow = _ref[1];
      return this.display(true);
    };

    WindowHandler.prototype.insertBreak = function(index) {
      var div, pos, text, _ref;

      div = this.lineDivs[index];
      pos = this.cursorPos(div);
      text = div.text();
      _ref = this.provider.lineBreak(this.from + index, text, pos), this.selected = _ref[0], this.cursorRow = _ref[1];
      return this.display(true);
    };

    WindowHandler.prototype.createLine = function(index) {
      var div,
        _this = this;

      div = $(document.createElement('div'));
      div.attr('tabindex', 0);
      this.lines.append(div);
      this.lineDivs.push(div);
      div.on('click', function() {
        log('click', index, _this.from, _this.selected);
        if (_this.edit && _this.selected !== _this.from + index) {
          _this.finishEdit(_this.selected - _this.from, 'before click');
        }
        _this.cursorRow = _this.cursorPos(div);
        _this.editLine(index, 'click');
        return true;
      });
      return div.on('keydown', function(e) {
        if (e.keyCode === 13) {
          _this.insertBreak(index);
          return false;
        }
        if (e.keyCode === 8) {
          if (_this.cursorPos(div) === 0) {
            _this.backSpace(index);
            return false;
          }
        }
        if (e.keyCode === 33) {
          _this.pg(index, true);
          return false;
        }
        if (e.keyCode === 34) {
          _this.pg(index, false);
          return false;
        }
        if (e.keyCode === 38) {
          return _this.cursor(index, 'up');
        }
        if (e.keyCode === 40) {
          return _this.cursor(index, 'down');
        }
      });
    };

    WindowHandler.prototype.pgScrollSize = function() {
      var size;

      size = Math.round(this.rows * 0.5);
      if (size <= 0) {
        size = 1;
      }
      return size;
    };

    WindowHandler.prototype.cursor = function(index, dir) {
      if (dir === 'up') {
        if (this.selected > 0) {
          this.finishEdit(index, 'cursor up');
          this.selected = this.selected - 1;
        }
        this.display(true);
        return false;
      }
      if (dir === 'down') {
        if (this.selected < this.provider.size() - 1) {
          this.finishEdit(index, 'cursor down');
          this.selected = this.selected + 1;
        }
        this.display(true);
        return false;
      }
      return true;
    };

    WindowHandler.prototype.pg = function(index, up) {
      if (up == null) {
        up = false;
      }
      this.finishEdit(index);
      if (up) {
        this.from = this.from - this.pgScrollSize();
      } else {
        this.from = this.from + this.pgScrollSize();
      }
      return this.display();
    };

    WindowHandler.prototype.display = function(show_cursor) {
      var i, normFrom, size, _i, _ref, _results,
        _this = this;

      if (show_cursor == null) {
        show_cursor = false;
      }
      size = this.provider.size();
      normFrom = function() {
        if (_this.from + _this.rows > size) {
          _this.from = size - _this.rows;
        }
        if (_this.from < 0) {
          return _this.from = 0;
        }
      };
      normFrom();
      if (show_cursor) {
        if (this.selected < this.from || this.selected >= this.from + this.rows) {
          this.from = this.selected - Math.round(this.rows / 2);
          normFrom();
        }
      }
      _results = [];
      for (i = _i = 0, _ref = this.rows; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
        this.renderLine(this.from + i, i);
        if (this.from + i === this.selected) {
          _results.push(this.editLine(i, 'display'));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    WindowHandler.prototype.refresh = function() {
      var i, _i, _ref;

      this.rows = Math.floor(this.lines.height() / this.char.height());
      this.cols = Math.floor(this.lines.width() / this.char.width());
      if (this.rows === 0) {
        this.rows = 1;
      }
      if (this.cols === 0) {
        this.cols = 1;
      }
      this.lineDivs = [];
      log('Refresh', this.rows, this.cols, this.lines.width(), this.lines.height());
      for (i = _i = 0, _ref = this.rows; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
        this.createLine(i);
      }
      this.display();
      if (this.selected === -1) {
        return this.editLine(0, 'refresh');
      }
    };

    return WindowHandler;

  })();

}).call(this);
