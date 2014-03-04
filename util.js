function StringBuilder() {
    
    var _value = "";
    
    this.append = function (value) {
        _value += value;
    }
    
    this.getValue = function() {
        return _value;
    }
}

function stringFormat(format, values) {
    return format.replace(/{(\d+)}/g,function(match, i){return values[i];});
}