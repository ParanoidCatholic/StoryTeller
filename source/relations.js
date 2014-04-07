function Set() {
    var _members = [];
    var _index = {};
    
    for(var i=0;i<arguments.length;i++) {
        var member = arguments[i];
        _members.push(member);
        if(!member.name) {
            throw new Error("Missing name in set");
        }
        _index[member.name] = i;
    }
    
    function _getByIndex(i) {
        var item = _members[i];
        if(item) {
            return item;
        }
        throw new Error(stringFormat("Index not found '{0}'",[i]));
    }
    
    
    function _getName(i) {
        var item = _getByIndex(i);
        return item.name;
    }
    
    function _getIndex(name) {
        var i = _index[name];                
        if(i>=0) {
            return _index[name];
        }
        throw new Error(stringFormat("Name not found '{0}'",[name]));
    }
    
    function _get(name) {
        return _getByIndex(_getIndex(name));
    }
    
    function _lookupByIndex(i, key) {
        var item = _getByIndex(i);   
        var value = item[key];
        if(value) {
            return value;
        }
        throw new Error(stringFormat("Key not found '{0}'",[key]));
    }
    
    function _lookup(name, key) {
        return _lookupByIndex(_getIndex(name),key);
    }
    
    function _size() {
        return _members.length;
    }
            
    this.getByIndex = _getByIndex;
    
    this.size = _size;
    this.get = _get;    
    this.getName = _getName;
    this.getIndex = _getIndex;
    this.getByIndex = _getByIndex;
    this.lookup = _lookup;
    this.lookupByIndex = _lookupByIndex;
}

function Relation() {

	var _size = 1;
    var _sets = [];
    var _data = [];	
        
    for(var i=0;i<arguments.length;i++) {
        var set = arguments[i];
        _size *= set.size();
        _sets.push(set);
    }
       
    for(var bits=0;bits<_size;bits+=16) {
        _data.push(0x0000);
    }
    
    function _getIndex() {        
        if(arguments.length!=_sets.length) {
            throw new Error(stringFormat("Wrong number of keys ({0}), expected ({1})",[arguments.length, _sets.length]));
        }
        var index = 0;
        for(var i=0;i<_sets.length;i++) {
            var set = _sets[i];
            index = index*set.size()+set.getIndex(arguments[i]);
        }
        return index;
    };
    
    function _check(keys) {
        var bitIndex = _getIndex.apply(this,keys);
        var index = bitIndex>>4;
        var offset = bitIndex%16;
        var mask = (0x0001 << offset);
        return (_data[index] & mask)==mask;
    };
    
    function _find(keys, result, results) {    
        var i = 0;
        while(i<keys.length && keys[i]!=null) {
            i++;
        }
        if(i==keys.length) {
            if(_check(keys)) {
                results.push(result.slice(0, result.length));
            }
        } else {
            var set = _sets[i];
            for(var j=0;j<set.size();j++) {
                var name = set.getName(j);
                keys[i] = name;
                result.push(name);
                _find(keys, result, results);
                result.pop();
            }
            keys[i] = null;
        }        
    }
            
    this.set = function() {
        var bitIndex = _getIndex.apply(this,arguments);
        var index = bitIndex>>4;
        var offset = bitIndex%16;
        _data[index] = _data[index] | (0x0001 << offset);
    };
    
    this.clear = function() {
        var bitIndex = _getIndex.apply(this,arguments);
        var index = bitIndex>>4;
        var offset = bitIndex%16;
        _data[index] = _data[index] & ~(0x0001 << offset);
    };
    
    this.check = function() { 
        return _check(arguments); 
    };
    
    this.find = function() {
        var results = [];
        var result = [];
        _find(arguments, result, results);
        return results;
    };
        
	this.size = function() {
		return _size;
	};
	
	this.toInt16Array = function() {
        var ints = [];
        for(var i=0;i<_data.length;i++) {
            ints.push(_data[0]);
        }
		return ints;
	};
	
	this.fromInt16Array = function(ints) {
        for(var i=0;i<_data.length;i++) {
            _data[i] = ints[i];
        }
	};
}