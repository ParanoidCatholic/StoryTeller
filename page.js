function Compiler() {

    var EndType = {
        incomplete : 1,
        indeterminate : 2,
        complete : 3,
        terminal : 4
    }
    
    var keyWords = {
        "if" : {value : "if({0}){", left : EndType.terminal, right : EndType.terminal},
        "elseIf" : {value : "} else if({0}) {", left : EndType.terminal, right : EndType.terminal},
        "else" : {value : "} else {", left : EndType.terminal, right : EndType.terminal},
        "endIf" : {value : "}", left : EndType.terminal, right : EndType.terminal},				
		"equal" : {value : "==", left : EndType.incomplete, right : EndType.incomplete},
        "notEqual" : {value : "!=", left : EndType.incomplete, right : EndType.incomplete},
        "lessThan" : {value : "<", left : EndType.incomplete, right : EndType.incomplete},
        "lessThanOrEqual" : {value : "<=", left : EndType.incomplete, right : EndType.incomplete},
        "greaterThan" : {value : ">", left : EndType.incomplete, right : EndType.incomplete},
        "greaterThanOrEqual" : {value : ">=", left : EndType.incomplete, right : EndType.incomplete},
        "not" : {value : "!", left : EndType.complete, right : EndType.incomplete},
        "and" : {value : "&&", left : EndType.incomplete, right : EndType.incomplete},
        "or" : {value : "||", left : EndType.incomplete, right : EndType.incomplete},
        "link" : {value : "ST.append(\"<a href=\\\"\" + ST.link({0},{1}) + \"\\\">\");", left : EndType.terminal, right : EndType.terminal}, 
        "endLink" : {value : "ST.append(\"</a>\");", left : EndType.terminal, right : EndType.terminal},
        "include" : {value : "ST.include({0},ST);", left : EndType.terminal, right : EndType.terminal},
		"randomBoolean" : { value : "ST.randomBoolean({0})", left : EndType.complete, right : EndType.complete},
		"randomInteger" : { value : "ST.randomInteger({0},{1})", left : EndType.complete, right : EndType.complete},
		"randomNumber" : { value : "ST.randomNumber({0},{1})", left : EndType.complete, right : EndType.complete},
    }

    var operators = {
        "+" : {value : "+", left : EndType.indeterminate, right : EndType.incomplete},
        "-" : {value : "-", left : EndType.indeterminate, right : EndType.incomplete},
        "*" : {value : "*", left : EndType.incomplete, right : EndType.incomplete},
        "/" : {value : "/", left : EndType.incomplete, right : EndType.incomplete}        
    }
    
    var componentRegex = /((\[\[)|([^[]))+|(\[[^\]]*\])/g;
    var commandRegex = /^\[[^\[]/;
    
    var tokenRegex = /[^\$_a-zA-Z0-9\s"]|([0-9]*\.[0-9]+)|([0-9]+)|(\$?[_a-zA-Z][_a-zA-Z0-9]*)|("([^"]|\\")*")/g
    var numberRegex = /^([0-9]*\.[0-9])|([0-9]+)$/
    var identifierRegex = /^[_a-zA-Z][_a-zA-Z]*$/    
	var localRegex = /^\$[_a-zA-Z][_a-zA-Z]*$/
    var stringRegex = /^"([^"]|\\")*"$/
    
    var TokenType = {
        openBrackets : 1,
        closeBrackets : 2,        
        openBraces : 3,
        closeBraces : 4,        
        comma : 5,
        colon : 6,
        equals : 7,
        identifier : 8,
        local : 9,
        number: 10,
        string : 11,
        operator : 12
    }
    
	function CommandReader(command) {	
	
		var _tokens = command.match(tokenRegex);
		var _index = 0;
                
		this.hasToken = function() {
			return _index < _tokens.length;
		}
		
		this.advance = function() {
			_index++;
			return this.hasToken();
		}
		
		this.token = function() {
			var value = _tokens[_index];
			
			if(typeof value == 'undefined') throw new Error(_index + "/" + _tokens.length);
			
            var type;
            
            if(value=="(") {
                type = TokenType.openBrackets;
            } else if(value==")") {
				type = TokenType.closeBrackets;
            } else if(value=="{") {
                type = TokenType.openBraces;
            } else if(value=="}") {
				type = TokenType.closeBraces;                
            } else if(value==",") {
                type = TokenType.comma;
            } else if(value==":") {
                type = TokenType.colon;
            } else if(value=="=") {    
                type = TokenType.equals;
            } else if(identifierRegex.test(value)) {
                type = TokenType.identifier;
            } else if(localRegex.test(value)) {
                type = TokenType.local;
            } else if(numberRegex.test(value)) {
                type = TokenType.number;
            } else if(stringRegex.test(value)) {
                type = TokenType.string;
            } else {
                type = TokenType.operator;
            }
            
            return {type: type, value: value}
		}
		
	}	
	
    function stringFormat(format, values) {
        return format.replace(/{(\d+)}/g,function(match, i){return values[i];});
    }
    
    function unionArrays(array1, array2) {
    
        if(!array1) {
            return array2;
        }
        if(!array2) {
            return array1;
        }
            
        var i = 0;
        var j = 0;
        
        var merged = [];
        
        while(i<array1.length && j<array2.length) {
            var val1 = array1[i];
            var val2 = array2[j];
                        
            if(val1<val2) {
                merged.push(val1);
                i++;
            } else {
                merged.push(val2);
                j++
                if(val1===val2) {
                    i++;
                }
            }
        }
        
        while(i<array1.length) {
            merged.push(array1[i++]);
        }
        
        while(j<array2.length) {
            merged.push(array2[j++]);
        }
        
        return merged;
    }
    
	function translateKeyWord(name, parameters) {
		if(!(name in keyWords)) {
			throw new Error("Unknown keyword: " + name)
		}
        
        var keyWord = keyWords[name];
        
        var replacements = parameters.values;
        
        if(keyWord.array) {
            replacements = parameters.values.slice(0,keyWord.array.start);
            replacements.push(parameters.values.slice(keyWord.array.start));
        }
        
        return {
            value : stringFormat(keyWord.value,replacements),
            left : keyWord.left,
            right : keyWord.right,
            locals : unionArrays(parameters.locals)
        };
	}
	        
	function readParameters(reader) {
		var parameters = [];
        var locals;
        
		while(reader.token().type != TokenType.closeBrackets) {	
			reader.advance();
			var code = processTokensAndCheckCode(reader);
			if(code!=null) {
				parameters.push(code.value);
                locals = unionArrays(locals,code.locals);
			} else if(reader.token().type == TokenType.comma) {
				parameters.push("undefined");
			}
		}
        reader.advance();
		return {values : parameters, locals : locals};
	}
			
    function processIdentifier(name, reader) {		
        if(reader.advance()) {
            var token = reader.token();
            switch (token.type) {
                case TokenType.openBrackets:
					return translateKeyWord(name, readParameters(reader));
                case TokenType.equals:
					reader.advance();
                    var code = processTokensAndCheckCode(reader);
                    return {value : stringFormat("ST.set(\"{0}\",{1})", [name, code.value]), left : EndType.complete, right : EndType.complete, locals : code.locals};
            }                                   
        }
		
		if(name in keyWords) {
            return translateKeyWord(name, []);
        } else {
            return {value : stringFormat("ST.get(\"{0}\")", [name]), left : EndType.complete, right : EndType.complete};
        }        
    }
    
    function processLocal(name, reader) {		
        if(reader.advance()) {
            var token = reader.token();
            if(token.type==TokenType.equals) {
				reader.advance();
                var code = processTokensAndCheckCode(reader);
                return {value : name + " = " + code.value, left : EndType.complete, right : EndType.complete, locals : code.locals};
            }                                   
        }
		        
		return {value : name, left : EndType.complete, right : EndType.complete, locals : [name]};       
    }
    		
    function processJson(reader) {
        var json = "{";
        var locals;
		var hasName = false;
		reader.advance();
		
		while(reader.hasToken()) {
										
            var token = reader.token();
			
            switch(token.type) {
				case TokenType.closeBraces:
					json += "}";
					return {value : json, left : EndType.complete, right : EndType.complete, locals: locals};
				case TokenType.identifier:
					if(hasName) {
						throw new Error("Unexpected identifier: " + token.value);
					}
					json += "\"" + token.value + "\" : ";
					hasName = true;
					reader.advance();
					break;
				case TokenType.colon:
					if(!hasName) {
						throw new Error("Unexpected token: " + token.value);
					}
					reader.advance();
                    var code = processTokensAndCheckCode(reader);
					json += code.value;
                    locals = unionArrays(locals, code.locals);
					hasName = false;
					break;
				default:
					if(!hasName) {
						throw new Error("Unexpected token: " + token.value);
					}
			}		
		}
        
		if(hasName) {
			throw new Error("Expected token: :")
		} else {
			throw new Error("Expected token: }")
		}
    }
    
    function joinCodeSegments(code1, code2, token) {
		if(code1 == null) {
			return code2;
		}
		
        if(code1.right == EndType.terminal || code2.left == EndType.terminal || code1.right == code2.left) {
            throw new Error("Unexpected token: " + token.value);
        }
        
        return {value : code1.value + code2.value, left : code1.left, right : code2.right, locals : unionArrays(code1.locals, code2.locals)};
    }
    
    var escapeCodes = {
        "n" : "\n",
        "r" : "\r",
        "t" : "\t"
    }
    
    function unescape(text) {
        return text.replace(/\\(.)/g,function(match, c){
            if(c in escapeCodes) {
                return escapeCodes[c];
            } else {
                return c;
            }
        });
    }
    
    var openBracketsCode = {value : "(", left : EndType.complete, right : EndType.incomplete};
    var closeBracketsCode = {value : "(", left : EndType.incomplete, right : EndType.complete};
    
    function processTokens(reader) {  
        
        var code = null;
        var bracketDepth = 0;
    
        while(reader.hasToken()) {
										
            var token = reader.token();
			            
            switch(token.type) {
                case TokenType.openBrackets:
                    code = joinCodeSegments(code, openBracketsCode, token);
                    bracketDepth++;
					reader.advance();
                    break;
                case TokenType.closeBrackets:
                    if(bracketDepth==0) {
                        return code;
                    }
                    code = joinCodeSegments(code, closeBracketsCode, token);;
                    bracketDepth--;
					reader.advance();
                    break;
                case TokenType.openBraces:
                    code = joinCodeSegments(code, processJson(reader), token);                    
                    break;
                case TokenType.closeBraces:
                    return code;
                case TokenType.comma:
                    if(bracketDepth!=0) {
                        throw new Error("Unexpected comma");
                    }
                    return code;
                case TokenType.colon:
                    return code;    
                case TokenType.equals:
                    throw new Error("Unexpected equals");
                case TokenType.identifier:
                    code = joinCodeSegments(code, processIdentifier(token.value, reader), token);
					break;
                case TokenType.local:
                    code = joinCodeSegments(code, processLocal(token.value.replace('$','LOCAL_'), reader), token);
                    break;
                case TokenType.number:                    
					code = joinCodeSegments(code, {value : token.value, left : EndType.complete, right : EndType.complete}, token);
					reader.advance();
                    break;
                case TokenType.string:
                    code = joinCodeSegments(code, {value : unescape(token.value), left : EndType.complete, right : EndType.complete}, token);
                    reader.advance();
                    break;
                case TokenType.operator:
                    if (!(token.value in operators)) {
                        throw new Error("Illegal operator encountered: " + token.value);    		
                    }
                    code = joinCodeSegments(code, operators[token.value], token);
					reader.advance();
                    break;
            }
        }
        
        return code;
    }    
        
    function processTokensAndCheckCode(reader) {
        var code = processTokens(reader);
        
		if(code != null && code.right == EndType.incomplete) {
            throw new Error("Unexpected end of expression");
		}
		        
		return code;
    }
            
    function processCommand(command) {
        		
		var reader = new CommandReader(command);
                
        var outputResult = reader.token().type == TokenType.equals;
        
        if(outputResult) {
            outputResult = true;
            reader.advance();
        }
		
        var code = processTokensAndCheckCode(reader);
        
		if(code != null) {
                
			if(outputResult) {
				return {value : "ST.append(" + code.value + ");", locals : code.locals}
			} else {
				if(code.right == EndType.terminal) {
					return {value: code.value, locals : code.locals};
				} else {
					return {value: code.value + ";", locals : code.locals};
				}
			}
		}
        
        return {value: ""}
    }
    		
    this.compilePage = function(page) {
        var components = page.match(componentRegex);
                
        var functionBody = "";
        var locals = [];
        
        for(var i=0; i<components.length; i++) {
            var component = components[i];
            if(commandRegex.test(component)) {                  
                code = processCommand(component.substring(1, component.length-1));
                functionBody += code.value;
                locals = unionArrays(locals, code.locals);
            } else {                
                functionBody += 'ST.append("' + component.replace(/\[\[/g,"[").replace(/]]/g,"]").replace(/[\r\n]+/g,"\\\r\n").replace(/"/g,"\\\"") + '"); ';
            }
        }
        
        var localDeclarations = ""
        
        for(var i=0; i<locals.length; i++) {
            localDeclarations += "var " + locals[i] + "=0;"
        }
        
        var compiledPage = localDeclarations+functionBody;
        
        debug.log("SOURCE PAGE: " + page);
        debug.log("COMPILED PAGE: " + compiledPage);
        
        return new Function("ST",compiledPage);
	}
}
    
	