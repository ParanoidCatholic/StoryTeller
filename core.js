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
        
    var _stateContents = [_pageId, random];
                
    for(var i=0; i<variables.length; i++) {
        _stateContents.push(variables[i].value);
    }
       
    function linkUrl(pageName) {
		
        if(!(pageName in _pages.index)) {
            throw new Error("Page not found: " + pageName);
        }
        
        var pageIdBackup = _pageId.get();
        _pageId.set(_pages.index[pageName]);
        var hash = _state.toBase64();
        _pageId.set(pageIdBackup);
        return "#" + hash;
    }
    
    function makeLink(block, pageName) {
        if(!(pageName in _pages.index)) {
            throw new Error("Page not found: " + pageName);
        }
    
        var backup = _state.toBase64();
        
        _pageId.set(_pages.index[pageName]);
        
        var bodyBuilder = new StringBuilder();
        block.execute(bodyBuilder);
                
		var resultBuilder = new StringBuilder();
		resultBuilder.append('<a href=\"#');
		resultBuilder.append(_state.toBase64());
		resultBuilder.append('">');
		resultBuilder.append(bodyBuilder.getValue());
		resultBuilder.append('</a>');
        
        _state.fromBase64(backup);
        
		return resultBuilder.getValue();
    }
	
	function includePage(pageName) {
		if(!(pageName in _pages.index)) {
            throw new Error("Page not found: " + pageName);
        }
		var pageId = _pages.index[pageName];
		var compiled = _compiler.compile(_pages.contents[pageId]);	
		var subPageBuilder = new StringBuilder();
        compiled.execute(subPageBuilder);
		return subPageBuilder.getValue();
	}
       
    var functions = [
        {name: "randomInteger", operation: random.getInteger.bind(random)},
        {name: "randomNumber", operation: random.getNumber.bind(random)},
        {name: "randomBoolean", operation: random.getBoolean.bind(random)},
		{name: "include", operation: includePage},
		{name: "link", operation: makeLink, blockFunction: true}
    ];
	        
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