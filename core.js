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
    
    var _variableIndex = {};
    var _relationIndex = {};
    var _stateContents = [_pageId, _randomNumberGenerator];
                
    for(var i=0; i<variables.length; i++) {
        var variable = variables[i];
        _stateContents.push(variable.value);
        _variableIndex[variable.name] = variable.value;
    }
    
    var _compiler = new Compiler();
    
    function processPage(pageId, helper) {
        var page = _pages.contents[pageId];
        pageFunction = _compiler.compilePage(page);	
		pageFunction(helper);
    }
    
	function getUserVariable(name) {
		return _variableIndex[name].get();
	}
	
	function setUserVariable(name, value) {
		_variableIndex[name].set(value);
        return _variableIndex[name].get();
	}
                
    function includePage(pageName, helper) {
        var pageId = _pages.index[pageName];
        processPage(pageId, helper);
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
        
	function PageHelper() {
	
		var _value = "";
        var _rng = _randomNumberGenerator;
        
		this.get = getUserVariable;
		this.set = setUserVariable;
		this.link = linkUrl;
        this.include = includePage;
		this.randomBoolean = function(probability){return _rng.getBoolean(probability);}
		this.randomInteger = function(min,max){return _rng.getInteger(min,max);}
		this.randomNumber = function(min,max){return _rng.getNumber(min,max);}
		this.append = function(text) {_value += text;}
				
		this.getValue = function() {return _value;}
	}
	        
    function showPage() {        
		var helper = new PageHelper();
        processPage(_pageId.get(), helper);		        
        _root.innerHTML = helper.getValue();
    }
    
    var _state = new State(_stateContents, showPage);
	showPage();
}

window.onload = function() {   		    
	var storyTeller = new StoryTeller(variables);
}