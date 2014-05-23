function PageNumberVariable(pageId) {
    this.isPageNumber = true;
    this.pageId = pageId;
}

var variables = [];
var functions = [];
var sets = [];
var relations = [];

function StoryTeller(variables, userFunctions, sets, relations) {
	                       
    var _pages = new LookupTable();
    
    var _viewports = new LookupTable();
		
	var _elements = document.body.getElementsByTagName("div");
		    
    var _root = null;
    
    var _config = {
        variables: [],
        sets: [],
        relations: []
    };
    
	for(var i=0; i<_elements.length; i++) {
				
		var element = _elements[i];
		var pageId = element.getAttribute("data-page-id");  
        var viewportId = element.getAttribute("data-viewport-id");  
        var viewportPage = element.getAttribute("data-viewport-page"); 
        var viewportType = element.getAttribute("data-viewport-type"); 
        var configType = element.getAttribute("data-config-type"); 
        
        if(pageId) {
            if(_pages.contains(pageId)) {
                throw new Error(stringFormat("Duplicate page ID: {0}", pageId));
            }             
            _pages.add(pageId,element.innerHTML);
        }
        
        if(viewportId) {            
            if(viewportId=="main") {
                if(_root) {
                    throw new Error("Duplicate main viewport.");
                }
                if(viewportPage) {
                    throw new Error("Main viewport cannot have a default page.");
                }                
                _root = element;
            } else {            
                if(_viewports.contains(viewportId)) {
                    throw new Error(stringFormat("Duplicate viewport ID: {0}", viewportId));
                }
                if(!viewportPage) {
                    throw new Error(stringFormat("Viewport '{0}' does not have a default page.", viewportId));
                } 
				_viewports.add(viewportId, {element: element, defaultPage: viewportPage, dynamic: viewportType=="dynamic"});		
            }
        }
        
        if(configType) {
            if(configType in _config) {
                _config[configType].push(element);
            } else {
                throw new Error(stringFormat("Config type '{0}' not recognised.", configType));
            }
        }
	}
    
    if(!_root) {
        if(_viewports.size()>0) {
            throw Error("Main viewport must be specified if any other viewports are.");
        }
        _root = document.body;
    }
        
    var _startPage = 0;
    
    if(_pages.size()<1) {
        throw new Error("No pages found");
    }
    
    if(_pages.contains("start")) {
        _startPage = _pages.getId("start");
    }
	
    function createPageNumberVariable(pageId) {
        var page;        
        if(pageId) {
            if(!_pages.contains(pageId)) {
                throw new Error(stringFormat("Page not found: {0}", pageId));
            }
            page = _pages.getId(pageId);
        } else {
            page = _startPage;
        }
        return new IntegerVariable(0, _pages.size()-1, page, false);
    }
    
    function createStaticPageNumber(pageId) {
        if(!_pages.contains(pageId)) {
            throw new Error(stringFormat("Page not found: {0}", pageId));
        }
        var page = _pages.getId(pageId);
        return {
            get: function() {
                return page;
            },
            set: function() {
                throw new Error("Cannot update page of a static viewport.");
            }
        }
    }
	
    var _pageId = createPageNumberVariable();
        
    var _stateContents = [random, _pageId];
    
    for(var i=0;i<_viewports.size();i++) {
        var viewport = _viewports.getById(i);
        if(viewport.dynamic) {
            viewport.pageId = createPageNumberVariable(viewport.defaultPage);
            _stateContents.push(viewport.pageId);
        } else {
            viewport.pageId = createStaticPageNumber(viewport.defaultPage);
        }
    }
    
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
    
    function concat(listA,listB) {
        if(!(listA instanceof Array)) {
            listA = [listA];
        }
        if(!(listB instanceof Array)) {
            listB = [listB];
        }
        return listA.concat(listB);
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
    
    function index(list) {
        var result = [];
        var length = list.length;
        for(var i=0;i<length;i++) {
            result.push([list[i],i,i-length]);
        }
        return result;
    }
    
    function mark(list) {
        var result = [];
        var max = list.length-1;
        result.push([list[0],true,false]);
        for(var i=1;i<max;i++) {
            result.push([list[i],false,false]);
        }
        result.push([list[max],false,true]);
        return result;
    }
    
    function viewportFunction(viewportId, pageIdentifier) {
    
        if(!_viewports.contains(viewportId)) {
			throw new Error(stringFormat("Viewport does not exist: {0}", viewportId));
		}
        
        var viewport = _viewports.getByName(viewportId);
        
        if(pageIdentifier) {
            if(typeof(pageIdentifier) == "number") {
                viewport.pageId.set(pageIdentifier);
            } else {
                if(!_pages.contains(pageIdentifier)) {
                    throw new Error(stringFormat("Page not found: {0}", pageIdentifier));
                }
                viewport.pageId.set(_pages.getId(pageIdentifier));
            }
        } else {        
            return viewport.pageId.get();
        }
    }
	
    function makeLink(block, pageIdentifierExpression) {
                        
        var backup = _state.toBase64();
        
		if(pageIdentifierExpression) {
			var pageIdentifier = pageIdentifierExpression.evaluate();
			if(typeof(pageIdentifier) == "number") {
				_pageId.set(pageIdentifier);
			} else {
				if(!_pages.contains(pageIdentifier)) {
					throw new Error(stringFormat("Page not found: {0}", pageIdentifier));
				}
				_pageId.set(_pages.getId(pageIdentifier));
			}
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
            if(!_pages.contains(pageIdentifier)) {
                throw new Error(stringFormat("Page not found: {0}", pageIdentifier));
            }
            var pageId = _pages.getId(pageIdentifier);
        }
        
        try {
            var compiled = _compiler.compile(_pages.getById(pageId));	
            return compiled.execute();
        } catch (error) {
            throw new Error(stringFormat("Error in subpage '{0}'\n{1}",pageIdentifier, error.message));
        }
	}
                       
    var functions = [
        {name: "randomInteger", operation: random.getInteger.bind(random)},
        {name: "randomNumber", operation: random.getNumber.bind(random)},
        {name: "randomBoolean", operation: random.getBoolean.bind(random)},
        {name: "currentPage", operation: function() {return _pages.getName(_pageId.get());}},
        {name: "currentPageNumber", operation: function() {return _pageId.get();}},
		{name: "include", operation: includePage},
        {name: "length", operation: length},
        {name: "none", operation: none},
        {name: "any", operation: any},
        {name: "first", operation: first},
        {name: "concat", operation: concat},
        {name: "exceptFirst", operation: exceptFirst},
        {name: "last", operation: last},
        {name: "exceptLast", operation: exceptLast},
		{name: "peel", operation: peel},
		{name: "peelFirst", operation: peelFirst},
		{name: "peelLast", operation: peelLast},
        {name: "index", operation: index},
        {name: "mark", operation: mark},
        {name: "viewport", operation: viewportFunction},
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
       
    function showPage(target,pageId) {    
        var pageIdValue = pageId.get();
        var name = _pages.getName(pageIdValue)
        var body = _pages.getById(pageIdValue);
        if(body) {             
            try {                
                var compiled = _compiler.compile(body);
                target.innerHTML = compiled.execute();
            } catch (error) {
                console.log(stringFormat("Error in page '{0}'\n{1}",name,error.message));
                target.innerHTML = '<span class="error">An error has occurred.</span>'
            }
        } else {
            console.log(stringFormat("Error. Page number {0} does not exist.",_pageId.get()));
            target.innerHTML = '<span class="error">An error has occurred.</span>'
        }
    }
       
    function renderCurrent() {
        showPage(_root,_pageId);
        
        for(var i=0;i<_viewports.size();i++) {
            var viewport = _viewports.getById(i);
            showPage(viewport.element, viewport.pageId);
        }
        
        window.scroll(0,0);
    }
    
    var _state = new State(_stateContents, renderCurrent);
	renderCurrent();
}

window.onload = function() {
	var storyTeller = new StoryTeller(variables, functions, sets, relations);
}