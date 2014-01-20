function RandomNumberGenerator() {
	
    var _seed = new IntegerVariable(0, Math.pow(2,32)-1, Math.floor(Math.random()*Math.pow(2,32)), false);
	    
	var P = 1013904223;
	var M = Math.pow(2,32);
	var A = 1664525;
	
	var DENOMINATOR = Math.pow(2,52);
	        
	this.getByte = function() {
		var x = _seed.get();
		x = (A*x+P)%M;
		_seed.set(x);
		return (x & 0xFF000) >> 12;
	}
	
	this.getDouble = function() {
		var numerator = 0;
		for(var i=0; i<6; i++) {
			numerator*=256;
			numerator+=this.getByte();
		}
		numerator*=16;
		numerator+=this.getByte() >> 4;
		return numerator/DENOMINATOR;
	}
    
    this.getBoolean = function(probability) {
        return this.getDouble()<probability;
    }
	
	this.getNumber = function(min, max) {
		return (this.getDouble() * (max-min))+min;
	}
	
	this.getInteger = function(min, max) {
		return Math.floor(this.getNumber(min,max));
	}
    
    this.size = function() {
		return _seed.size();
	}
	
	this.toInt16Array = function() {
		return _seed.toInt16Array();
	}
	
	this.fromInt16Array = function(ints) {
		_seed.fromInt16Array(ints); 
	}
}