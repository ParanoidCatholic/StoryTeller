function StringBuilder() {
    
    var _values = [];
    
    this.append = function (value) {
        if(value!=null) {
            _values.push(value);
        }        
    }
    
    this.getValue = function() {
        return _values.join("");
    }
}

function stringFormat() {
    var vargs = arguments;
    return vargs[0].replace(/{(\d+)}/g,function(match, i){return vargs[Number(i)+1];});
}

function LookupTable() {
    var index = {};
    var contents = [];
    
    function add(name,value) {
        index[name] = contents.length;
        contents.push({name: name, value: value});
    }
    
    function size() {
        return contents.length;
    }
    
    function allNames() {
        var names = [];
        for(var i=0;i<size();i++) {
            names.push(contents[i].name);
        }
        return names;
    }
    
    function contains(name) {
        return name in index;
    }
    
    function getName(id) {
        return contents[id].name;
    }
    
    function getId(name) {
        return index[name];
    }
    
    function getById(id) {
        return contents[id].value;
    }
    
    function getByName(name) {
        return getById(getId(name));
    }
    
    this.add = add;
    this.size = size;
    this.allNames = allNames;
    this.contains = contains;
    this.getName = getName;
    this.getId = getId;
    this.getById = getById;
    this.getByName = getByName;
}