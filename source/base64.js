var Base64 = function() {
    var base64Chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_";

    var base64Values = {}

    for(var i=0; i<base64Chars.length; i++) {
        base64Values[base64Chars.charAt(i)] = i;
    }

    function Base64Builder() {
        
        var _chars = "";
        var _partialValue = 0;
        var _nPartialBits = 0;
            
        function addBits(value, nBits) { 
            value = (value << _nPartialBits) | _partialValue;
            nBits += _nPartialBits
            while(nBits>=6) {
                _chars += base64Chars.charAt(value & 0x3F);
                nBits-=6;
                value = value >> 6;
            }
            _partialValue = value;
            _nPartialBits = nBits;
        }
        
        this.addInt16Array = function(data, nBits) {
            for(var j = 0; j < data.length; j++) {
                var bitsToRead = Math.min(nBits,16);
                addBits(data[j],bitsToRead);
                nBits -= bitsToRead;
            }
        }
        
        this.chars = function() {
            if(_nPartialBits == 0) {
                return _chars;
            } else {
                return _chars + base64Chars.charAt(_partialValue);
            }
        }
    }        
       
    function Base64Reader(chars) {

        var _chars = chars;
        var _index = 0;
        var _partialValue = 0;
        var _nPartialBits = 0;
        
        function readNextChar() {
            return base64Values[_chars.charAt(_index++)];
        }
        
        function readBits(nBits) {
            var value = _partialValue;
            var bitsRead = _nPartialBits;
            while(bitsRead<nBits) {
                value = value | readNextChar() << bitsRead;
                bitsRead += 6;
            }
            _nPartialBits = bitsRead-nBits;
            _partialValue = value >> nBits;
            return value & ((1 << nBits)-1);
        }
        
        this.readInt16Array = function(nBits) {
            var data = [];
            while(nBits>0) {
                var bitsToRead = Math.min(nBits,16);
                data.push(readBits(bitsToRead));
                nBits-=bitsToRead;
            }
            return data;
        }
    }
    
    return {
        Builder: Base64Builder,
        Reader: Base64Reader
    };
}();