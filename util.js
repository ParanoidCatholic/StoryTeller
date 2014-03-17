function StringBuilder() {
    
    var _values = [];
    
    this.append = function (value) {
        if(value) {
            _values.push(value);
        }        
    }
    
    this.getValue = function() {
        return _values.join("");
    }
}

function stringFormat(format, values) {
    return format.replace(/{(\d+)}/g,function(match, i){return values[i];});
}