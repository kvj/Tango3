var compressHistory = function (history, config, controller, handler) {
	// Compress history according to config
	var result = [];
	var size = 0;
	var maxSize = config.max || -1;
	var nextPiece = function (i) {
		if (i>=history.length) {
			return handler(null, result);
		};
		var h = history[i];
		var existing = null;
		for (var j = 0; j < result.length; j++) {
			if (result[j].doc_id == h.doc_id) {
				existing = result[j];
				break;
			};
		};
		var removed = false;
		if (existing && existing.doc) {
			// Remove document
			size -= existing.doc.length;
			delete existing.doc;
			removed = true;
		};
		if ((h.operation == 0 || h.operation == 1) && (h.client != config.client)) {
			// Need document
			controller.document(h.doc_id, function (err, doc) {
				if (err || !doc) {
					// Document not found - skip this history item
					return nextPiece(i+1);
				};
				var docTxt = doc;
				if (maxSize != -1 && result.length>0 && !removed && docTxt.length+size>maxSize) {
					// Stop
					return handler(null, result);
				};
				size += docTxt.length;
				h.doc = docTxt;
				result.push(h);
				nextPiece(i+1);
			});
		} else {
			result.push(h);
			nextPiece(i+1);
		}
	};
	nextPiece(0);
};

var iterateOver = function (array, handler, cb) {
	var result = [];
	var onItem = function (index) {
		if (index>=array.length) {
			return cb? cb(null, result): null;
		};
		var item = array[index];
		handler(item, function (err, res) {
			if (err) {
				return cb? cb(err, item, index): null;
			};
			result.push(res);
			onItem(index+1);
		}, index);
	};
	onItem(0);
}

if (typeof(module) != 'undefined') {
	module.exports.compressHistory = compressHistory;
	module.exports.iterateOver = iterateOver;
};