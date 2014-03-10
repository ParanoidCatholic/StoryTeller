function StoryTeller(variables) {
	   
    var _root = null;
                    
    var _pages = {
		contents: [],
		index: {}
	};
		
	var _elements = document.body.getElementsByTagName("*");
	var _pageNumber = 0;
		
	for(var i=0; i<_elements.length; i++) {
				
		var element = _elements[i];
		
        switch(element.className) {
            case "StoryTeller":
                if(_root) {
                    throw new Error("Multiple 'StoryTeller' Divs");
                }
                _root = element;
                break;
            case "page":			
                if(_pages.index[element.id]) {
                    throw new Error(stringFormat("Duplicate page ID: {0}", [element.id]));
                }
                            
                _pages.contents[_pageNumber] = {name: element.id, body: element.innerHTML};
                _pages.index[element.id] = _pageNumber;
                _pageNumber++;
                break;                
		}		
	}
    
    if(!_root) {
        _root = document.body;
    }
    
    var _startPage = 0;
    
    if(_pages.contents.length<1) {
        throw new Error("No pages found");
    }
    
    if(_pages.index["start"]) {
        _startPage = _pages.index["start"];
    }
		
    var _pageId = new IntegerVariable(0, _pages.contents.length-1, _startPage, false);
        
    var _stateContents = [_pageId, random];
    
    if(variables) {            
        for(var i=0; i<variables.length; i++) {
            _stateContents.push(variables[i].value);
        }
    }
        
    function makeLink(block, pageNameExpression) {
        
        var pageName = pageNameExpression.evaluate();
                
        if(!(pageName in _pages.index)) {
            throw new Error(stringFormat("Page not found: {0}", [pageName]));
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
            throw new Error(stringFormat("Page not found: {0}", [pageName]));
        }
		var pageId = _pages.index[pageName];
        
        try {
            var compiled = _compiler.compile(_pages.contents[pageId].body);	
            var subPageBuilder = new StringBuilder();
            compiled.execute(subPageBuilder);
            return subPageBuilder.getValue();
        } catch (error) {
            throw new Error(stringFormat("Error in subpage '{0}'\n{1}",[pageName, error.message]));
        }
	}
           
    var functions = [
        {name: "randomInteger", operation: random.getInteger.bind(random)},
        {name: "randomNumber", operation: random.getNumber.bind(random)},
        {name: "randomBoolean", operation: random.getBoolean.bind(random)},
        {name: "currentPage", operation: function() {return _pages.contents[_pageId.get()].name;}},
		{name: "include", operation: includePage},
		{name: "link", operation: makeLink, blockFunction: true}
    ];
	        
    var _compiler = new Compiler(variables, functions);
    	        
    function showPage() {        
        
		try {
			var compiled = _compiler.compile(_pages.contents[_pageId.get()].body);	
			var outputBuilder = new StringBuilder();
        
            compiled.execute(outputBuilder);
            _root.innerHTML = outputBuilder.getValue();
        } catch (error) {
            console.log(stringFormat("Error in page '{0}'\n{1}",[_pages.contents[_pageId.get()].name,error.message]));
            _root.innerHTML = '<span class="error">An error has occurred.</span>'
        }
    }
    
    var _state = new State(_stateContents, showPage);
	showPage();
}

window.onload = function() {   		    
	var storyTeller = new StoryTeller(variables);
}