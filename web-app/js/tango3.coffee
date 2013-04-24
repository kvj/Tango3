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

    size: ->
      return @lines.length

    get: (index) ->
      return @lines[index]

    editable: (index, column) ->
      yes

    edit: (index, text) ->
      @lines[index] = text

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

  add: (index, text) ->

  remove: (index) ->

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

  editLine: (index, reason) ->
    log 'editLine', index, reason
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
    log 'finishEdit', pos, @edit, index, reason
    if @edit and pos>= 0
      @cursorRow = pos
    div.removeClass('line_edit')
    if @edit
      text = div.text()
      @provider.edit(@from+index, text)
      div.text(text)
      div.attr('contentEditable', no)
    @edit = no

  renderLine: (index, lineIndex) ->
    div = @lineDivs[lineIndex]
    div.attr('class', 'win char line')
    if index<@provider.size()
      text = @provider.get(index)
      div.text(text)
    else
      div.text('')

  createLine: (index) ->
    div = $(document.createElement('div'))
    div.attr('tabindex', 0)
    @lines.append(div)
    @lineDivs.push(div)
    div.on 'click', =>
      selIndex = @selected-@from
      log 'click', index, selIndex, @selected, @from
      if selIndex isnt index
        @finishEdit(selIndex, 'before click')
        @cursorRow = @cursorPos div
        @editLine(index, 'click')
      return yes
    div.on 'keydown', (e) =>
      if e.keyCode is 13
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
      log 'Key', e.keyCode

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
