yepnope({
  load: ['lib/zepto.min.js', 'lib/zepto/touch.js', 'css/tango3.css'],
  complete: ->
    $(document).ready ->
      test()
})

log = ->
  arr = []
  arr.push(item) for item in arguments 
  console.log.apply(console, arr)

test = ->
  class TestProvider extends WindowProvider

    constructor: ->
      @lines = []
      for i in [0...50]
        @lines.push "Line no #{i}"

    colorize: (index) ->
      result = []
      text = @get(index)
      if text.indexOf('no') != -1
        result.push([text.indexOf('no'), 2, 'text0'])
      if text.indexOf('xxx') != -1
        result.push([text.indexOf('xxx'), 3, 'text1'])
      return result

    size: ->
      return @lines.length

    get: (index) ->
      return @lines[index]

    editable: (index, column) ->
      yes

    edit: (index, text) ->
      @lines[index] = text

    lineBreak: (index, text, pos) ->
      @lines[index] = text.substr(0, pos)
      @lines.splice(index+1, 0, text.substr(pos))
      [index+1, 0]

    backSpace: (index, text) ->
      if index is 0
        # First line
        return [0, 0]
      prevLength = @lines[index-1].length
      @lines[index-1] = @lines[index-1]+text
      @lines.splice(index, 1)
      [index-1, prevLength]

  provider = new TestProvider()
  win = new WindowHandler()
  div = $(document.createElement('div')).attr('id', 'testWin')
  div.appendTo(document.body)
  div.append(win.init(provider))
  log 'Win created'
  setTimeout ->
    win.refresh()
  , 100

class WindowProvider

  size: ->
    0

  get: (index) ->
    ''
  
  editable: (index, column) ->
    no

  edit: (index, text) ->

  lineBreak: (index, text, pos) ->
    [index, pos]

  backSpace: (index, text) ->
    [index, 0]

  colorize: (index) ->
    []

class WindowHandler

  init: (@provider) ->
    @from = 0
    @selected = -1
    @cursorRow = 0
    div = $(document.createElement('div')).addClass('win root')
    @lines = $(document.createElement('div')).addClass('win lines').appendTo(div)
    @scroll = $(document.createElement('div')).addClass('win scroll').appendTo(div)
    @char = $(document.createElement('div')).addClass('win char hidden').appendTo(div)
    @char.text('0')
    @lineDivs = []
    @lines.on 'swipeUp', =>
      @pg(@selected-@from, no)
      return no
    @lines.on 'swipeDown ', =>
      @pg(@selected-@from, yes)
      return no
    return div

  moveCursor: (div, text, pos) ->
    range = document.createRange()
    if pos<text.length
      range.setStart(div.childNodes[0], pos)
      range.collapse(yes)
    else
      range.selectNodeContents(div)
      range.collapse(no)
    selection = window.getSelection()
    selection.removeAllRanges()
    selection.addRange(range)

  colorize: (div, text, spans) ->
    res = [[0, text.length]] # Start point
    for span in spans
      if span[0]>=0 and span[1]>0 and span[0]+span[1]<=text.length
        # Correct bounds 1, 1 = 2
        for item, i in res
          if item[0]+item[1] <= span[0]
            # Skip all spans at left
            continue
          if item[0]<span[0] and item[0]+item[1]>span[0]+span[1]
            # Inside
            ritem = [span[0]+span[1]]
            ritem[1] = item[0]+item[1]-ritem[0]
            ritem[2] = item[2]
            item[1] = span[0]-item[0]
            res.splice(i+1, 0, span, ritem)
            break
          if item[0]>=span[0] and item[0]+item[1]<=span[0]+span[1]
            # Inside - opposite
            res.splice(i, 1)
            i = i-1
            continue
          if item[0]>=span[0]
            # span - item
            res.splice(i, 0, span)
            end = item[0]+item[1]
            item[0] = span[0]+span[1]
            item[1] = end - item[0]
          else
            # item - span
            item[1] = span[0] - item[0]
            res.splice(i+1, 0, span)
          i = i+1
    div.empty()
    for item in res
      span = $(document.createElement('span'))
      span.text(text.substr(item[0], item[1]))
      if item[2]
        # Have theme
        span.addClass('th_'+item[2])
      div.append(span)

  editLine: (index, reason) ->
    # log 'editLine', index, reason
    div = @lineDivs[index]
    div.addClass('line_edit')
    @selected = @from+index
    if @provider.editable(@selected, @cursorRow)
      text = @provider.get(@selected)
      div.text(text)
      @edit = yes
      div.attr('contentEditable', yes)
      if @cursorRow>=0
        @moveCursor(div.get(0), text, @cursorRow)
    div.focus()

  cursorPos: (div) ->
    # log 'Sel:', window.getSelection(), window.getSelection().rangeCount
    if window.getSelection().rangeCount is 0
      return -1
    range = window.getSelection().getRangeAt(0)
    treeWalker = document.createTreeWalker(div.get(0), NodeFilter.SHOW_TEXT, (node) ->
      nodeRange = document.createRange()
      nodeRange.selectNodeContents(node)
      if nodeRange.compareBoundaryPoints(Range.END_TO_END, range) < 1 then return NodeFilter.FILTER_ACCEPT else return NodeFilter.FILTER_REJECT
    , no)
    charCount = 0
    while treeWalker.nextNode()
      charCount = charCount + treeWalker.currentNode.length
    if range.startContainer.nodeType is 3
      charCount = range.startOffset
    return charCount

  finishEdit: (index, reason = 'none') ->
    div = @lineDivs[index]
    pos = @cursorPos(div)
    # log 'finishEdit', pos, @edit, index, reason
    if @edit and pos>= 0
      @cursorRow = pos
    div.removeClass('line_edit')
    if @edit
      text = div.text()
      @provider.edit(@from+index, text)
      div.attr('contentEditable', no)
      @renderLine(@from+index, index)
    @edit = no

  renderLine: (index, lineIndex) ->
    div = @lineDivs[lineIndex]
    div.attr('class', 'win char line')
    if index<@provider.size()
      text = @provider.get(index)
      colors = @provider.colorize(index)
      @colorize(div, text, colors)
    else
      div.text('')

  backSpace: (index) ->
    div = @lineDivs[index]
    text = div.text()
    [@selected, @cursorRow] = @provider.backSpace(@from+index, text)
    @display(yes)

  insertBreak: (index) ->
    div = @lineDivs[index]
    pos = @cursorPos(div)
    text = div.text()
    [@selected, @cursorRow] = @provider.lineBreak(@from+index, text, pos)
    @display(yes)

  createLine: (index) ->
    div = $(document.createElement('div'))
    div.attr('tabindex', 0)
    @lines.append(div)
    @lineDivs.push(div)
    div.on 'click', =>
      log 'click', index, @from, @selected
      if @edit and @selected isnt @from+index
        @finishEdit(@selected-@from, 'before click')
      @cursorRow = @cursorPos div
      @editLine(index, 'click')
      return yes
    div.on 'keydown', (e) =>
      if e.keyCode is 13
        @insertBreak(index)
        return no
      if e.keyCode is 8
        if @cursorPos(div) is 0
          @backSpace(index)
          return no
      if e.keyCode is 33
        @pg(index, yes)
        return no
      if e.keyCode is 34
        @pg(index, no)
        return no
      if e.keyCode is 38
        return @cursor(index, 'up')
      if e.keyCode is 40
        return @cursor(index, 'down')
      # log 'Key', e.keyCode

  pgScrollSize: ->
    # Returns number of page to scroll
    size = Math.round(@rows*0.5)
    if size <= 0 then size = 1
    return size

  cursor: (index, dir) ->
    # Moves cursor to direction
    if dir is 'up'
      if @selected>0
        @finishEdit(index, 'cursor up')
        @selected = @selected-1
      @display(yes)
      return no
    if dir is 'down'
      if @selected < @provider.size()-1
        @finishEdit(index, 'cursor down')
        @selected = @selected+1
      @display(yes)
      return no
    return yes

  pg: (index, up = no) ->
    #Scrolls page up or down
    @finishEdit(index)
    if up then @from = @from - @pgScrollSize() else @from = @from + @pgScrollSize()
    @display()

  display: (show_cursor = no) ->
    size = @provider.size()
    normFrom = =>
      if @from+@rows>size then @from = size-@rows
      if @from<0 then @from = 0
    normFrom()
    if show_cursor
      if @selected<@from or @selected>=@from+@rows
        # Have to show
        @from = @selected-Math.round(@rows/2)
        normFrom()
    for i in [0...@rows]
      # Render line
      @renderLine(@from+i, i)
      if @from+i is @selected
        @editLine(i, 'display')

  refresh: () ->
    @rows = Math.floor(@lines.height()/@char.height())
    @cols = Math.floor(@lines.width()/@char.width())
    if @rows is 0 then @rows = 1
    if @cols is 0 then @cols = 1
    @lineDivs = []
    log 'Refresh', @rows, @cols, @lines.width(), @lines.height()
    for i in [0...@rows]
      @createLine(i)
    @display()
    if @selected is -1 then @editLine(0, 'refresh')
