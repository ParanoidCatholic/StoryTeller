function State(values, onHashChange) {
	 
	var _values = values;
    var _onHashChange = onHashChange;
    	
	function fromBase64(chars) {        
		var reader = new Base64.Reader(chars);				
		for (var i = 0; i < _values.length; i++) {
			var value = _values[i];
			var data = reader.readInt16Array(value.size())
			value.fromInt16Array(data);
		}        
	}

    this.toBase64 = function() {
		var builder = new Base64.Builder();	
		for (var i = 0; i < _values.length; i++) {
			var value = _values[i];      
			builder.addInt16Array(value.toInt16Array(), value.size());      
		}          
		return builder.chars();
	}
    
    function getHash() {
        return window.location.hash.replace(/^#/,'');
    }
    
    var _hash = getHash();
    if(_hash.length==0) {
        _hash = this.toBase64();
        window.location.hash = _hash;
    } else {
        fromBase64(_hash);
    }
    
    function checkHash() {
		var newHash = getHash();
		if(newHash!=_hash) {
			_hash = newHash;
			fromBase64(_hash);
            _onHashChange();
		}
	}   
            
	var _intervalId = window.setInterval(checkHash, 100);
};