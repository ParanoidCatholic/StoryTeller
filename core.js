function StoryTeller(variables) {
	    
    var _root = document.body;
    
    var _pages = function() {
		var pages = {
			contents: [],
			index: {}
		}
		
		var elements = document.body.getElementsByTagName("*");
		var pageNumber = 0;
		
		for(var i=0; i<elements.length; i++) {
				
			var element = elements[i];
				
			if(element.className == "page") {	
			
				if(pages.index[element.id]) {
					throw new Error("Duplicate page ID: " + element.id);
				}
							
				pages.contents[pageNumber] = element.innerHTML;
				pages.index[element.id] = pageNumber;
				pageNumber++;
			}		
		}
	
		return pages;
	}();
    
    var _startPage = 0;
    
    if(_pages.contents.length<1) {
        throw new Error("No pages found");
    }
    
    if(_pages.index["start"]) {
        _startPage = pages.index["start"];
    }
    
    var _pageId = new IntegerVariable(0, _pages.contents.length-1, _startPage, false);
    
    var _randomNumberGenerator = new RandomNumberGenerator();
    
    var _stateContents = [_pageId, _randomNumberGenerator];
                
    for(var i=0; i<variables.length; i++) {
        _stateContents.push(variables[i].value);
    }
       
    function linkUrl(pageName, overrides) {
        if(!(pageName in _pages.index)) {
            throw new Error("Page not found: " + pageId);
        }
        
        var pageIdBackup = _pageId.get();
        _pageId.set(_pages.index[pageName]);
        var variableBackup = {};
        for(key in overrides) {
            variableBackup[key] = getUserVariable(key);
            setUserVariable(key, overrides[key]);
        }
        var hash = _state.toBase64();
        _pageId.set(pageIdBackup);
        for(key in variableBackup) {			
            setUserVariable(key, variableBackup[key]);
        }
        return "#" + hash;
    }
       
    var functions = [
        {name: "randomInteger", operation: _randomNumberGenerator.getInteger.bind(_randomNumberGenerator)},
        {name: "randomNumber", operation: _randomNumberGenerator.getNumber.bind(_randomNumberGenerator)},
        {name: "randomBoolean", operation: _randomNumberGenerator.getBoolean.bind(_randomNumberGenerator)}
    ]
        
    var _compiler = new Compiler(variables, functions);
    	        
    function showPage() {        
        var compiled = _compiler.compile(_pages.contents[_pageId.get()]);	
        var outputBuilder = new StringBuilder();
        compiled.execute(outputBuilder);
        _root.innerHTML = outputBuilder.getValue();
    }
    
    var _state = new State(_stateContents, showPage);
	showPage();
}

window.onload = function() {   		    
	var storyTeller = new StoryTeller(variables);
}