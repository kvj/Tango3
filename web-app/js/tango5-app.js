(function(tango5){
var App = function () {
	this.ui = new tango5.PlatformUIProvider();
	this.ui.whenReady(function () {
		this.wm = new tango5.WindowFrameManager();
		this.wm.setUIProvider(this.ui);
		this.ui.log('App started', this.ui.width(), this.ui.height());
		var lines = [];
		for (var i = 0; i < 20; i++) {
			lines.push('Line no '+i);
		};
		var provider = new tango5.PlainTextController();
		provider.load(lines);
		this.frame = new tango5.CenterWindowFrame({
			width: 40,
			height: 10,
			frame: true,
			controller: provider
		});
		this.wm.addFrame(this.frame);
		var dialog = new tango5.FixedListController([tango5.windowFactory.lineCaption('Hi Korea!', 'center'),tango5.windowFactory.lineTextEditor('', 'Enter text:'), tango5.windowFactory.lineCaption('Hi Korea!'), tango5.windowFactory.lineButtons(['OK', 'Cancel'])]);
		var dialogFrame = new tango5.CenterWindowFrame({
			width: 50,
			height: 0,
			frame: true,
			autoHeight: 4,
			selected: 1,
			controller: dialog
		});
		this.wm.addFrame(dialogFrame);
	}.bind(this));	
};

var app = new App();

})(tango5);