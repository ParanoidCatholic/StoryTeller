var debug = {
    enabled : false,
    log: function(message) {
        if(this.enabled) {
            console.log(message);
        }
    }
}