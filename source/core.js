function PageNumberVariable(pageId) {
    this.isPageNumber = true;
    this.pageId = pageId;
}

var variables = [];
var functions = [];
var sets = [];
var relations = [];

function StoryTeller(variables, userFunctions, sets, relations) {
	   
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
	
    function createPageNumberVariable(pageId) {
        var page;        
        if(pageId) {
            if(!(pageId in _pages.index)) {
                throw new Error(stringFormat("Page not found: {0}", [pageIdentifier]));
            }
            page = _pages.index[pageId];
        } else {
            page = _startPage;
        }
        return new IntegerVariable(0, _pages.contents.length-1, _startPage, false);
    }
	
    var _pageId = createPageNumberVariable();
        
    var _stateContents = [_pageId, random];
    
    if(variables && variables.length) {            
        for(var i=0; i<variables.length; i++) {
            if(variables[i].isPageNumberVariable) {
                variables[i] = createPageNumberVariable(variables[i].pageId);
            }            
            _stateContents.push(variables[i].value);
        }
    }
		      
    function length(list) {
        return list.length;
    }
           
    function none(list) {
        return list.length == 0;
    }
    
    function any(list) {
        return list.length > 0;
    }
    
    function first(list) {
        if(list.length>0) {
            return list[0];
        } else {
            return null;
        }        
    }
    
    function exceptFirst(list) {
        return list.slice(1);
    }
    
    function last(list) {
        if(list.length>0) {
            return list[list.length-1];
        } else {
            return null;
        }        
    }
    
    function exceptLast(list) {
        return list.slice(0,list.length-1);
    }
	
	function peel(list) {
		if(list.length>1) {
			return [list[0],list.slice(1,list.length-1),list[list.length-1]];
		} else if(list.length>0) {
			return [list[0],[],null];
		} else {
			return [null,[],null];
		}
	}
	
	function peelFirst(list) {
		if(list.length>0) {
			return [list[0],list.slice(1,list.length)];
		} else {
			return [null,[]];
		}
	}
	
	function peelLast(list) {
		if(list.length>0) {
			return [list.slice(0,list.length-1),list[list.length-1]];
		} else {
			return [[],null];
		}
	}
                      
    function makeLink(block, pageIdentifierExpression) {
        
        var pageIdentifier = pageIdentifierExpression.evaluate();
        
        var backup = _state.toBase64();
        
        if(typeof(pageIdentifier) == "number") {
            _pageId.set(pageIdentifier);
        } else {
            if(!(pageIdentifier in _pages.index)) {
                throw new Error(stringFormat("Page not found: {0}", [pageIdentifier]));
            }
            _pageId.set(_pages.index[pageIdentifier]);
        }
        
        var body = block.execute();
                
		var resultBuilder = new StringBuilder();
		resultBuilder.append('<a href="#');
		resultBuilder.append(_state.toBase64());
		resultBuilder.append('">');
		resultBuilder.append(body);
		resultBuilder.append('</a>');
        
        _state.fromBase64(backup);
        
		return resultBuilder.getValue();
    }
    
    function resetLink(block) {                  
    
        var body = block.execute();
                
		var resultBuilder = new StringBuilder();
		resultBuilder.append('<a href="#" onclick="window.location.hash = \'\';window.location.reload(true);">');
		resultBuilder.append(body);
		resultBuilder.append('</a>');
                
		return resultBuilder.getValue();
    }
    	
	function includePage(pageIdentifier) {
    
        if(typeof(pageIdentifier) == "number") {
            var pageId = pageIdentifier;
        } else {
            if(!(pageIdentifier in _pages.index)) {
                throw new Error(stringFormat("Page not found: {0}", [pageIdentifier]));
            }
            var pageId = _pages.index[pageIdentifier];
        }
        
        try {
            var compiled = _compiler.compile(_pages.contents[pageId].body);	
            return compiled.execute();
        } catch (error) {
            throw new Error(stringFormat("Error in subpage '{0}'\n{1}",[pageIdentifier, error.message]));
        }
	}
                       
    var functions = [
        {name: "randomInteger", operation: random.getInteger.bind(random)},
        {name: "randomNumber", operation: random.getNumber.bind(random)},
        {name: "randomBoolean", operation: random.getBoolean.bind(random)},
        {name: "currentPage", operation: function() {return _pages.contents[_pageId.get()].name;}},
        {name: "currentPageNumber", operation: function() {return _pageId.get();}},
		{name: "include", operation: includePage},
        {name: "length", operation: length},
        {name: "none", operation: none},
        {name: "any", operation: any},
        {name: "first", operation: first},
        {name: "exceptFirst", operation: exceptFirst},
        {name: "last", operation: last},
        {name: "exceptLast", operation: exceptLast},
		{name: "peel", operation: peel},
		{name: "peelFirst", operation: peelFirst},
		{name: "peelLast", operation: peelLast},
		{name: "link", operation: makeLink, blockFunction: true},
        {name: "reset", operation: resetLink, blockFunction: true}        
    ];
    
    if(userFunctions && userFunctions.length) {
        for(var i=0;i<userFunctions.length;i++) {
            functions.push(userFunctions[i]);
        }
    }
	
	function relationResult(relation, keys) {
    
        var nullKeys = false;
        for(var i=0;i<keys.length;i++) {
            if(keys[i]==null) {
                nullKeys = true;
                break;
            }
        }
    
        return {
            get: function() {
                if(nullKeys) {
                    return relation.find.apply(relation,keys);
                } else {
                    return relation.check.apply(relation,keys);
                }                
            },
            
            set: function(value) {
                if(nullKeys) {
                    throw new Error("Relation with null keys cannot be assigned to");
                }
				if(value) {
					relation.set.apply(relation,keys);
				} else {
					relation.clear.apply(relation,keys);
				}
                return relation.check.apply(relation,keys);
            }
        };
    }
	
	function relationFunction(name, relation) {
		return {
			name: name,
			operation: function() {
				return relationResult(relation, arguments);
			},
			propertyResult: true
		};
	}
    
    function setFunction(name, set) {
		return {
			name: name,
			operation: function(id,key) {
				if(id) {                
                    if(key) {
                        if(typeof(id) == "number") {
                            return set.lookupByIndex(id,key);
                        } else {
                            return set.lookup(id,key);
                        }
                    } else {
                        if(typeof(id) == "number") {
                            return set.getName(id);    
                        } else {
                            return set.getIndex(id);
                        }
                    }
                } else {
                    return set.getAllNames();
                }
			}
		};
	}
	
	if(relations && relations.length) {
		for(var i=0; i<relations.length; i++) {          
			var definition = relations[i];
            _stateContents.push(definition.relation);
			functions.push(relationFunction(definition.name,definition.relation));
        }
	}
    
    if(sets && sets.length) {
        for(var i=0; i<sets.length; i++) {
            var definition = sets[i];
            functions.push(setFunction(definition.name,definition.set));
        }
    }
		
    var _compiler = new Compiler(variables, functions);
    	        
    function showPage() {  
        var page = _pages.contents[_pageId.get()];
        if(page && page.body) {             
            try {                
                var compiled = _compiler.compile(page.body);
                _root.innerHTML = compiled.execute();
            } catch (error) {
                console.log(stringFormat("Error in page '{0}'\n{1}",[page.name,error.message]));
                _root.innerHTML = '<span class="error">An error has occurred.</span>'
            }
        } else {
            console.log(stringFormat("Error. Page number {0} does not exist.",[_pageId.get()]));
            _root.innerHTML = '<span class="error">An error has occurred.</span>'
        }
        
        window.scroll(0,0);
    }
    
    var _state = new State(_stateContents, showPage);
	showPage();
}

window.onload = function() {
	var storyTeller = new StoryTeller(variables, functions, sets, relations);
}