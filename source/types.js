function BooleanVariable(value) {

	var _value = Boolean(value);
		
	this.set = function(value) {
		_value = Boolean(value);
	}
	
	this.get = function() {
		return _value;
	}
	
	this.size = function() {
		return 1;
	}
	
	this.toInt16Array = function() {
		if(_value) {
			return [1];
		} else {
			return [0];
		}
	}
	
	this.fromInt16Array = function(ints) {
		_value = (ints[0] & 0x01)==1;
	}
}           
		   
function IntegerVariable(min, max, value, wrap) {

	if(max<min) {
		throw new Error("max cannot be less than min")
	}

	var _min = min;
	var _max = max;
	var _wrap = wrap;    
	var _range = max-min+1;
	var _size = Math.ceil(Math.log(_range)/Math.log(2));
	
	function fixValue(value) {
		value = Math.floor(value);
		
		if(isNaN(value)) {
			value = 0;
		}
	
		if(value<min) {
			if(wrap) {
				value = ((value - _min)%_range+_range)%_range+min;
			} else {
				value = _min;
			}
		}
		
		if(value>max) {
			if(wrap) {
				value = (value - _min)%_range+min;
			} else {
				value = _max;
			}
		}
		
		return value;
	}
	
	var _value = fixValue(value);
	 
	this.set = function(value) {
		_value = fixValue(value);
	}
	
	this.get = function() {
		return _value;
	}
	
	this.size = function() {
		return _size;
	}
	
	this.toInt16Array = function() {
		var ints = [];
		var nInts = Math.ceil(_size/16);
		var raw = _value - _min;
		for(var i = 0; i < nInts; i++) {
			ints[i] = raw % 65536;
			raw = Math.floor(raw/65536);
		}
		return ints;
	}
	
	this.fromInt16Array = function(ints) {
		var raw = 0;
		for(var i = ints.length-1; i >= 0 ; i--) {
			raw *= 65536;
			raw += ints[i];
		}
		_value = fixValue(raw + _min); 
	}
}

function NumberVariable(value) {
		
	var _value = Number(value);
	
	this.set = function(value) {
		_value = Number(value);
	}
	
	this.get = function() {
		return _value;
	}
	
	this.size = function() {
		return 64;
	}
	
	function doubleToParts(value) {
		if(value == Number.POSITIVE_INFINITY) {
			return {
				sign: 0,
				biasedExponent: 0x7FF,
				mantissa: 0
			}
		}
		if(value == Number.NEGATIVE_INFINITY) {
			return {
				sign: 1,
				biasedExponent: 0x7FF,
				mantissa: 0
			}
		}
		if(isNaN(value)) {
			return {
				sign: 1,
				biasedExponent: 0x7FF,
				mantissa: 0xFFFFFFFFFFFFF
			}
		}    
		if(value==0) {
			return {
				sign: 0,
				biasedExponent: 0,
				mantissa: 0
			}
		}
		var parts = {};
		parts.sign = (value < 0) ? 1 : 0;
		var normalised = Math.abs(value);
		var exponent = Math.floor(Math.log(normalised)/Math.log(2));
		parts.biasedExponent = exponent+1023;
		if(parts.biasedExponent==0) {
			var multiplier = Math.pow(2,-1022);
			parts.mantissa = (normalised/multiplier)*4503599627370496;
		} else {                
			var multiplier = Math.pow(2,exponent);
			var fraction = normalised/multiplier;
			parts.mantissa = (fraction-1)*4503599627370496;
		}
		return parts;    
	}

	function doubleFromParts(parts) {
		if(parts.biasedExponent == 0x7FF) {
			if(parts.mantissa == 0) {
				if(parts.sign==0) {
					return Number.POSITIVE_INFINITY;
				} else {
					return Number.NEGATIVE_INFINITY;
				}
			} else {
				return NaN;
			}
		}
		var fraction;
		var multiplier;
		if(parts.biasedExponent == 0) {
			fraction = parts.mantissa/4503599627370496;
			multiplier = Math.pow(2,-1022);        
		} else {
			fraction = 1+(parts.mantissa/4503599627370496);
			var exponent = parts.biasedExponent-1023;
			multiplier = Math.pow(2,exponent);        
		}
		var normalised = fraction*multiplier;
		return (parts.sign==1) ? -normalised : normalised;    
	}
	
	this.toInt16Array = function() {
		var parts = doubleToParts(_value);
		var raw = parts.mantissa;
		var ints = [];  
		for(var i=0; i<3; i++) {
			ints[i] = raw % 65536;
			raw = Math.floor(raw/65536);
		}
		ints[3] = (parts.sign << 15) | (parts.biasedExponent << 4) | raw;
		return ints;
	}
	
	this.fromInt16Array = function(ints) {
		var parts = {};
		var raw = ints[3] & 0xF;
		for(var i = 2; i >= 0 ; i--) {
			raw *= 65536;
			raw += ints[i];
		}
		parts.mantissa = raw;
		parts.biasedExponent = (ints[3] >> 4) & 0x7FF;
		parts.sign = ints[3] >> 15;
		_value = doubleFromParts(parts);
	}
}