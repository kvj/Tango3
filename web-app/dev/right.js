$$.initRightPanel = function () {
    this.rightPanelWidth = 250;
    this.rightPanelFlow = true;
    this.rightPanelDiv = this.el('div', document.body, {
        'class': 'rightPanelFlow'
    });
    this.find({tags: 'rightPanel'}, null, function (items) {
        for (var i = 0; i<items.length; i++) {
            this.open(items[i], {
                parent: this.rightPanelDiv,
                notitle: true,
                nobottom: true,
                'static': true
            });
        }
        window.addEventListener('resize', function() {
            this.reflowRightPanel();
        }.bind(this));
        setTimeout(function (){
            this.reflowRightPanel();
        }.bind(this), 0)
    }.bind(this));
};

$$.reflowRightPanel = function() {
    var winWidth = document.body.clientWidth;
    var contentDiv = document.body.querySelectorAll('div.root')[0];
    var contentWidth = contentDiv.offsetWidth;
    var contentLeft = contentDiv.offsetLeft;
    if (winWidth-contentWidth-contentLeft>this.rightPanelWidth) {
        if (!this.rightPanelFlow) {
            this.rightPanelFlow = true;
            this.rightPanelDiv.className = 'rightPanelFlow';
            document.body.appendChild(this.rightPanelDiv);
        }
    } else {
        if (this.rightPanelFlow) {
            this.rightPanelFlow = false;
            this.rightPanelDiv.className = 'rightPanel';
            this.itemsRoot.parentNode.insertBefore(this.rightPanelDiv, this.itemsRoot);
        }
    }
};

$$.events.on('start', function() {
    $$.initRightPanel();
});

$$.pluginLoaded('RightPanelPlugin');
