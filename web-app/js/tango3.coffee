yepnope({
  load: ['lib/zepto.min.js','css/tango3.css'],
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
      for i in [0...20]
        @lines.push "Line no #{i}"

    size: ->
      return @lines.length

    get: (index) ->
      return @lines[index]

  provider = new TestProvider()
  win = new WindowHandler()
  div = $(document.createElement('div')).attr('id', 'testWin')
  div.appendTo(document.body)
  div.append(win.init(provider))
  log 'Win created'
  setTimeout ->
    win.refresh()
  , 0

class WindowProvider

  size: ->
    0

  get: (index) ->
    ''

class WindowHandler

  init: (@provider) ->
    div = $(document.createElement('div')).addClass('win root')
    @lines = $(document.createElement('div')).addClass('win lines').appendTo(div)
    @scroll = $(document.createElement('div')).addClass('win scroll').appendTo(div)
    @selected = 0
    @lineDivs = []
    return div

  editLine: (index, position = -1) ->
    div = @lineDivs[index]
    div.attr('contentEditable', yes)

  renderLine: (index, prepend = no) ->
    line = @provider.get(index)
    div = $(document.createElement('div')).addClass('win line')
    if prepend 
      @lines.prepend(div) 
      @lineDivs.unshift(div)
    else 
      @lines.append(div)
      @lineDivs.push(div)
    div.text(line)
    div.on 'mousedown', =>
      @editLine(index)
    div.on 'blur', =>
      div.text(div.text())
      log 'Blured'
    div.on 'focus', =>
      log 'Focus'

  refresh: () ->
    log 'Refresh', @lines.height()
    for i in [0...@provider.size()]
      @renderLine(i, no)
