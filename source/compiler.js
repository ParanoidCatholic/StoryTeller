function Compiler(variables, functions) {

    var lineRegex = /((\[\[)|([^[]))+|(\[(("(([\\]")|[^"])*")|([^\]]))*\])/g;
    var statementRegex = /^\[(("((\\")|[^"])*")|([^\]]))*\]$/;
    var tokenRegex = /[^\$_a-zA-Z0-9\s"]|([0-9]*\.[0-9]+)|([0-9]+)|(\$[_a-zA-Z0-9]+)|([_a-zA-Z][_a-zA-Z0-9]*)|("((\\")|[^"])*")/g;

    var identifierRegex = /^[_a-zA-Z][_a-zA-Z0-9]*$/;
    var localRegex = /^\$[_a-zA-Z0-9]+$/;
    var numberRegex = /^([0-9]*\.[0-9])|([0-9]+)$/;
    var stringRegex = /^"((\\")|[^"])*"$/;

    function LocalVariable() {
        
        var _value;
        
        this.get = function() {
            return _value;
        }
        
        this.set = function(value) {
            _value = value;
        }
    }

    var TokenType = {
        functionBracket:    1,
        leftBracket:        2,
        rightBracket:       3,
        leftBrace:          4,
        rightBrace:         5,
        separator:          6,
        func:               7, 
		blockFunc:          8,
        operator:           9,
        unaryOperator:      10,
        variable:           11,
        literal:            12,
        marker:             13
    };

    var ContextMode = {
        start:      1,
        incomplete: 2,
        complete:   3,
        func:       4
    };

    var tokenTypeMode = [];
     
    tokenTypeMode[TokenType.leftBracket] = ContextMode.start;
    tokenTypeMode[TokenType.functionBracket] = ContextMode.start;
    tokenTypeMode[TokenType.rightBracket] = ContextMode.complete;
    tokenTypeMode[TokenType.leftBrace] = ContextMode.start;
    tokenTypeMode[TokenType.rightBrace] = ContextMode.complete;
    tokenTypeMode[TokenType.separator] = ContextMode.start;
    tokenTypeMode[TokenType.func] = ContextMode.func;
    tokenTypeMode[TokenType.blockFunc] = ContextMode.func;
    tokenTypeMode[TokenType.operator] = ContextMode.incomplete;
    tokenTypeMode[TokenType.unaryOperator] = ContextMode.incomplete;
    tokenTypeMode[TokenType.variable] = ContextMode.complete;
    tokenTypeMode[TokenType.literal] = ContextMode.complete;

	function CodeBlock() {
        var _lines = [];
        
        this.addLine = function(line) {
            _lines.push(line);
        }
        
        this.execute = function() { 
            var outputBuilder = new StringBuilder();
            for(var i=0;i<_lines.length;i++) {  
                var line = _lines[i];
                try{
                    outputBuilder.append(line.execute());
                } catch(error) {
                    if(line.source) {
                        throw new Error(stringFormat("Unable to execute statement '{0}':\n{1}", [line.source, error.message]));
                    }
                } 
            }
            return outputBuilder.getValue();
        }
    }

    function IfBlock(condition) {
        var _blocks = [];
        var _activeBlock;
        
        function _addCondition(condition) {        
            _activeBlock = {condition: condition, block: new CodeBlock()};
            _blocks.push(_activeBlock);
        }
        
        _addCondition(condition);
        
        this.addCondition = function(condition) {        
            if(_activeBlock.condition == null) {
                throw new Error("Unreachable 'else' clause");
            }
            _addCondition(condition);
        }
        
        this.addLine = function(line) {
            _activeBlock.block.addLine(line);
        }
                        
        this.execute = function() {
            for(var i=0;i<_blocks.length;i++) {
                var block = _blocks[i];
                if(block.condition == null || block.condition.evaluate().value) {
                    return block.block.execute();
                }
            }
        }
    }
        
    function foreachFunction(block, elementExpression, valuesExpression) {  
        
        var values = valuesExpression.evaluate();        
        var resultBuilder = new StringBuilder();
                
        if(values.hasNext && values.next) {
            while(values.hasNext()) {
                elementExpression.assign(values.next());
                resultBuilder.append(block.execute());
            }
        } else if(values instanceof Array) {
            for(var i=0;i<values.length;i++) {
                elementExpression.assign(values[i]);
                resultBuilder.append(block.execute());
            }
        } else {
            elementExpression.assign(value);
            resultBuilder.append(block.execute());
        }
        
        return resultBuilder.getValue();
    }
	
    function FunctionBlockParameter(parameter) {
        this.evaluate = function(){return parameter.evaluate().value;};
        this.assign = parameter.assign.bind(parameter);
    }
    
	function FunctionBlock(func, parameters) {
        
		var _block = new CodeBlock();
		
		var _parameters = [_block];
		
        for(var i=0;i<parameters.length;i++) {
            var parameter = parameters[i];
            _parameters.push(new FunctionBlockParameter(parameter));
        }
                                
        this.addLine = function(line) {
            _block.addLine(line);
        }
        
        this.execute = function() {
			return func.apply(null, _parameters);
        }
	}
	
    function invalidAssignment(value) {
        throw new Error("Expression cannot be assigned to");
    }

    function visible(value) {
        return {
            value: value,
            output: true
        }
    }

    function invisible(value) {
        return {
            value: value,
            output: false
        }
    }

    function literalExpression(value) {	
        return {
            evaluate: function() {
                return visible(value);
            },
            
            assign: function(value) {
                throw new Error("Attempt to assign to literal");
            }
        };
    }

    function variableExpression(variable) {
        return {
            evaluate: function() {
                return visible(variable.get());
            },
            
            assign: function(value) {
                variable.set(value);
                return invisible(variable.get());
            }
        };
    }

    function assignmentExpression(leftOperand,rightOperand) {
        return {
            evaluate: function() {return leftOperand.assign(rightOperand.evaluate().value);},        
            assign: invalidAssignment
        };
    }
    
    function equalExpression(leftOperand,rightOperand) {
        return {
            evaluate: function() {return visible(leftOperand.evaluate().value==rightOperand.evaluate().value);},        
            assign: invalidAssignment
        };
    }
    
    function notEqualExpression(leftOperand,rightOperand) {
        return {
            evaluate: function() {return visible(leftOperand.evaluate().value!=rightOperand.evaluate().value);},        
            assign: invalidAssignment
        };
    }
    
    function lessThanExpression(leftOperand,rightOperand) {
        return {
            evaluate: function() {return visible(leftOperand.evaluate().value<rightOperand.evaluate().value);},        
            assign: invalidAssignment
        };
    }
    
    function lessThanOrEqualExpression(leftOperand,rightOperand) {
        return {
            evaluate: function() {return visible(leftOperand.evaluate().value<=rightOperand.evaluate().value);},        
            assign: invalidAssignment
        };
    }
    
    function greaterThanExpression(leftOperand,rightOperand) {
        return {
            evaluate: function() {return visible(leftOperand.evaluate().value>rightOperand.evaluate().value);},        
            assign: invalidAssignment
        };
    }
    
    function greaterThanOrEqualExpression(leftOperand,rightOperand) {
        return {
            evaluate: function() {return visible(leftOperand.evaluate().value>=rightOperand.evaluate().value);},        
            assign: invalidAssignment
        };
    }

    function additionExpression(leftOperand,rightOperand) {
        return {
            evaluate: function() {return visible(leftOperand.evaluate().value+rightOperand.evaluate().value);},        
            assign: invalidAssignment
        };
    }

    function subtractionExpression(leftOperand,rightOperand) {
        return {
            evaluate: function() {return visible(leftOperand.evaluate().value-rightOperand.evaluate().value);},        
            assign: invalidAssignment
        };
    }

    function multiplicationExpression(leftOperand,rightOperand) {
        return {
            evaluate: function() {return visible(leftOperand.evaluate().value*rightOperand.evaluate().value);},        
            assign: invalidAssignment
        };
    }

    function divisionExpression(leftOperand,rightOperand) {
        return {
            evaluate: function() {return visible(leftOperand.evaluate().value/rightOperand.evaluate().value);},        
            assign: invalidAssignment
        };
    }
    
    function modulusExpression(leftOperand,rightOperand) {
        return {
            evaluate: function() {return visible(leftOperand.evaluate().value%rightOperand.evaluate().value);},        
            assign: invalidAssignment
        };
    }
	
	function projectionExpression(leftOperand, rightOperand) {						
		return {
			evaluate: function() {
				var items;				
				var value = leftOperand.evaluate().value;				
				if(value instanceof Array) {
					items = value;
				} else {
					items = [value];
				}
			
				var index = rightOperand.evaluate().value;
				if(index instanceof Array) {				
					var result = [];
					for(var i=0;i<index.length;i++) {
						var currentIndex = index[i];
                        if(currentIndex<0) {
                            currentIndex = items.length+currentIndex;
                        }
						if(currentIndex>=0 && currentIndex<items.length) {
							result.push(items[currentIndex]);
						} else {
							throw new Error("Index out of range.")
						}
					}
					return visible(result);
				} else {
                    if(index<0) {
                        index = items.length+index;
                    }
					if(index>=0 && index<items.length) {
						return visible(items[index]);
					} else {
						throw new Error("Index out of range.")
					}
				}
			},        
            assign: invalidAssignment
        };		
	}
    
    function andExpression(leftOperand,rightOperand) {
        return {
            evaluate: function() {return visible(leftOperand.evaluate().value && rightOperand.evaluate().value);},        
            assign: invalidAssignment
        };
    }
    
    function orExpression(leftOperand,rightOperand) {
        return {
            evaluate: function() {return visible(leftOperand.evaluate().value || rightOperand.evaluate().value);},        
            assign: invalidAssignment
        };
    }

    function notExpression(operand) {
        return {
            evaluate: function() {return visible(!operand.evaluate().value);},        
            assign: invalidAssignment
        };
    }

    function negativeExpression(operand) {
        return {
            evaluate: function() {return visible(-operand.evaluate().value);},        
            assign: invalidAssignment
        };
    }

    function functionExpression(func,parameters,parameterResult) {
        if(parameterResult) {
            return {
                evaluate: function() {
                    evaluatedParameters = parameters.evaluate().value;
                    var parameterArray;
                    if(parameters.items) {
                        parameterArray = evaluatedParameters;
                    } else {
                        parameterArray = [evaluatedParameters];
                    }
                    return visible(func.apply(null,parameterArray).get());                        
                },
                assign: function(value) {
                    evaluatedParameters = parameters.evaluate().value;
                    var parameterArray;
                    if(parameters.items) {
                        parameterArray = evaluatedParameters;
                    } else {
                        parameterArray = [evaluatedParameters];
                    }
                    return invisible(func.apply(null,parameterArray).set(value));                        
                }
            };
        } else {
            return {
                evaluate: function() {
                    evaluatedParameters = parameters.evaluate().value;
                    var parameterArray;
                    if(parameters.items) {
                        parameterArray = evaluatedParameters;
                    } else {
                        parameterArray = [evaluatedParameters];
                    }
                    return visible(func.apply(null,parameterArray));                        
                },
                assign: invalidAssignment
            };
        }
    }
		
	function blockFunctionExpression(func,parameters) {    
        var parameterArray;
        if(parameters.items) {
            parameterArray = parameters.items;
        } else {
            parameterArray = [parameters];
        }
        return {
			block: new FunctionBlock(func, parameterArray),
            evaluate: function() {
                throw new Error("Block functions cannot be evaluated in a statement.");
            },
            assign: invalidAssignment
        };
    }
    
    function arrayExpression(items) {
        return {
            items: items,
            evaluate: function() {
                var result = [];
                for(var i=0;i<items.length;i++) {
                    result.push(items[i].evaluate().value)
                }
                return invisible(result);                        
            },
            assign: function(value) {  
                if(value instanceof Array) {                
                    var n = Math.min(items.length, value.length);
                    var result = [];
                    for(var i=0;i<n;i++) {
                        result.push(items[i].assign(value[i]));
                    }
                    return invisible(result);
                } else if(items.length>0) {
                        return invisible(items[0].assign(value));                
                } else {
                    return invisible([]);
                }
            }
        }
    }
	
    var marker = {tokenType: TokenType.marker};

    var leftBracket = {tokenType: TokenType.leftBracket};
    var functionBracket = {tokenType: TokenType.functionBracket};
    var rightBracket = {tokenType: TokenType.rightBracket};
    var leftBrace = {tokenType: TokenType.leftBrace};
    var rightBrace = {tokenType: TokenType.rightBrace};
    var separator = {tokenType: TokenType.separator};
    var assignmentOperator = {tokenType: TokenType.operator, precedence: 0, expression: assignmentExpression};    
    var andOperator = {tokenType: TokenType.operator, precedence: 1, expression: andExpression};
    var orOperator = {tokenType: TokenType.operator, precedence: 1, expression: orExpression};
    var equalOperator = {tokenType: TokenType.operator, precedence: 2, expression: equalExpression};
    var notEqualOperator = {tokenType: TokenType.operator, precedence: 2, expression: notEqualExpression};
    var lessThanOperator = {tokenType: TokenType.operator, precedence: 2, expression: lessThanExpression};
    var lessThanOrEqualOperator = {tokenType: TokenType.operator, precedence: 2, expression: lessThanOrEqualExpression};
    var greaterThanOperator = {tokenType: TokenType.operator, precedence: 2, expression: greaterThanExpression};
    var greaterThanOrEqualOperator = {tokenType: TokenType.operator, precedence: 2, expression: greaterThanOrEqualExpression};
    var additionOperator = {tokenType: TokenType.operator, precedence: 3, expression: additionExpression};
    var subtractionOperator = {tokenType: TokenType.operator, precedence: 3, expression: subtractionExpression};
    var multiplicationOperator = {tokenType: TokenType.operator, precedence: 4, expression: multiplicationExpression};
    var divisionOperator = {tokenType: TokenType.operator, precedence: 4, expression: divisionExpression};
    var modulusOperator = {tokenType: TokenType.operator, precedence: 4, expression: modulusExpression};
    var projectionOperator = {tokenType: TokenType.operator, precedence: 5, expression: projectionExpression};
    var notOperator = {tokenType: TokenType.unaryOperator, expression: notExpression};
    var negativeOperator = {tokenType: TokenType.unaryOperator, expression: negativeExpression};
		
    var symbols = [];

    symbols[ContextMode.start] = {        
        "(" : leftBracket,
        ")" : rightBracket,
        "{" : leftBrace,
        "}" : rightBrace,
        "-" : negativeOperator,
        "not" : notOperator,
        "true": {tokenType: TokenType.literal, value: true},
        "false": {tokenType: TokenType.literal, value: false},
        "null": {tokenType: TokenType.literal, value: null}
    };

    symbols[ContextMode.complete] = {
        ")" : rightBracket,
        "}" : rightBrace,
        "," : separator,
        "=" : assignmentOperator,
        "equal" : equalOperator,
        "notEqual" : notEqualOperator,
        "lessThan" : lessThanOperator,
        "lessThanOrEqual" : lessThanOrEqualOperator,
        "greaterThan" : greaterThanOperator,
        "greaterThanOrEqual" : greaterThanOrEqualOperator,
        "+" : additionOperator,
        "-" : subtractionOperator,    
        "*" : multiplicationOperator,
        "/" : divisionOperator,
        "%" : modulusOperator,
        "and" : andOperator,
        "or" : orOperator,
        "@" : projectionOperator
    };

    symbols[ContextMode.incomplete] = symbols[ContextMode.start];

    symbols[ContextMode.func] = {
        "(" : functionBracket
    };
    
    var reserved = {
        "if": true,
        "else": true,
        "foreach": true,
        "in": true,
        "end": true,
        "equal": true,
        "notEqual": true,
        "lessThan": true,
        "lessThanOrEqual": true,
        "greaterThan": true,
        "greaterThanOrEqual": true,
        "not": true,
        "and": true,
        "or": true,
        "true": true,
        "false": true,
        "null": true
    };
    
	var funcs = {};
    
    if(functions && functions.length) {
        for(var i=0; i<functions.length; i++) {
            var funcDef = functions[i];
            var name = funcDef.name;
            if(funcs[name]) {
                throw Error(stringFormat("Duplicate function name '{0}'",[name]));
            }
            if(!identifierRegex.test(name) || reserved[name]) {
                throw Error(stringFormat("Illegal function name '{0}'",[name]));
            }
            if(funcDef.blockFunction) {
                funcs[name] = {tokenType: TokenType.blockFunc, operation: funcDef.operation}
            } else {
                funcs[name] = {tokenType: TokenType.func, operation: funcDef.operation, propertyResult: funcDef.propertyResult}
            }
        }
    }
    
    var globals = {};

    if(variables && variables.length) {
        for(var i=0; i<variables.length; i++) {        
            var variable = variables[i];
            var name = variable.name;
			if(name) {
				if(globals[name]) {
					throw Error(stringFormat("Duplicate variable name '{0}'",[name]));
				}
				if(funcs[name]) {
					throw Error(stringFormat("Variable name already used as function name '{0}'",[name]));
				}
				if(!identifierRegex.test(name) || reserved[name]) {
					throw Error(stringFormat("Illegal variable name '{0}'",[name]));
				}
				globals[name] = {tokenType: TokenType.variable, value: variable.value};
			}
        }
    }
			
	var BracketType = {
		normal: 1,
		func: 2,
        curly: 3
	};
	
	var normalBracket = {bracketType: BracketType.normal};
	var functionBracket = {bracketType: BracketType.func};		
    var curlyBracket = {bracketType: BracketType.curly};	
    
    function RpnExpressionBuilder() {
        var _stack = [];
        
        this.addToken = function(token) {
            switch(token.tokenType) {  
                case TokenType.operator:
                    var rightOperand = _stack.pop();
                    var leftOperand = _stack.pop();
                    _stack.push(token.expression(leftOperand,rightOperand));
                    break;
                case TokenType.unaryOperator:
                    var operand = _stack.pop();
                    _stack.push(token.expression(operand));
                    break;
                case TokenType.func:				
                    _stack.push(functionExpression(token.operation,_stack.pop(),token.propertyResult));
                    break;
				case TokenType.blockFunc:                    
                    _stack.push(blockFunctionExpression(token.operation,_stack.pop()));
                    break;
                case TokenType.literal:
                    _stack.push(literalExpression(token.value));
                    break;
                case TokenType.variable:
                    _stack.push(variableExpression(token.value));
                    break;				
				case TokenType.array:
					_stack.push(arrayBracket);
                    break;
                case TokenType.leftBrace:
					_stack.push(curlyBracket);
                    break;
                case TokenType.leftBracket:
                    _stack.push(normalBracket);
                    break;	
                case TokenType.functionBracket:
                    _stack.push(functionBracket);
                    break;                    
                case TokenType.rightBracket:
                case TokenType.rightBrace:
                    var items = [];
                    var item;
                    while(!(item=_stack.pop()).bracketType) {
                        items.push(item);
                    }
                    if(token.tokenType==TokenType.rightBrace) {
                        if(item.bracketType!=BracketType.curly) {
                            throw new Error("Mismatched brackets")
                        }
                        _stack.push(arrayExpression(items.reverse()));
                    } else {
                        if(item.bracketType==BracketType.curly) {
                            throw new Error("Mismatched brackets")
                        }     
                        if(item.bracketType==BracketType.func) {
                            _stack.push(arrayExpression(items.reverse()));
                        } else if(items.length==1) {
                            _stack.push(items[0]);
                        } else {
                            throw new Error("Lists must use curly brackets")
                        }
                    }                    
            }
        }
        
        this.getExpression = function() {
            if(_stack.length==0) {
                throw new Error("Empty expression");
            }
            if(_stack.length>1) {
                throw new Error("Incomplete expression");
            }
            return _stack.pop();
        }
    }

    function ExpressionBuilder() {
        
        var _stack = [];
        var _builder = new RpnExpressionBuilder();
            
        function topTokenTypeIs(tokenTypes) {
            if(_stack.length==0) return false;
            
            var tokenType = _stack[_stack.length-1].tokenType;
            
            for(var i=0;i<tokenTypes.length;i++) {
                if(tokenType==tokenTypes[i]) return true;
            } 
            
            return false;
        }
        
        function topTokenPrecedenceHigher(p) {
            if(_stack.length==0) return false;   
            var token = _stack[_stack.length-1];
            return token.tokenType==TokenType.unaryOperator || (token.tokenType==TokenType.operator && token.precedence >= p);
        }
            
        this.addToken = function(token) {
            switch(token.tokenType) { 
				case TokenType.functionBracket:
                case TokenType.leftBracket:
                case TokenType.leftBrace:
					_builder.addToken(token);
					_stack.push(token);
                    break;
                case TokenType.rightBracket:
                case TokenType.rightBrace:
                    while(!topTokenTypeIs([TokenType.leftBracket, TokenType.leftBrace, TokenType.functionBracket])) {
                        _builder.addToken(_stack.pop());
                    }
                    _stack.pop();
                    _builder.addToken(token);
                    if(topTokenTypeIs([TokenType.func, TokenType.blockFunc])) {
                        _builder.addToken(_stack.pop());
                    }
                    break;
                case TokenType.separator:
                    while(!topTokenTypeIs([TokenType.leftBracket, TokenType.leftBrace, TokenType.functionBracket])) {
                        _builder.addToken(_stack.pop());
                    }
                    break;
                case TokenType.operator:
                    while(topTokenPrecedenceHigher(token.precedence)) {
                        _builder.addToken(_stack.pop());
                    }
                    _stack.push(token);
                    break;
                case TokenType.unaryOperator:
                    _stack.push(token);
                    break;
                case TokenType.func:
				case TokenType.blockFunc:
                    _stack.push(token);
                    break;
                default:    
                    _builder.addToken(token);
            }
        }
        
        this.getExpression = function() {
            while(_stack.length>0) {
                _builder.addToken(_stack.pop());
            }
            
            return _builder.getExpression();
        }
    }
    
    function htmlLine(html) {
        return {
            execute: function() {
                return html;
            }
        };
    }

    function expressionLine(expression, source) {
        return {
            execute: function() {
                var result = expression.evaluate();
                if(result.output) {
                    return result.value;
                }
            },
            source: source
        };
    }
    
    this.compile = function(code) {
        
        var rootBlock = new CodeBlock();
        var blockStack = [];
        var currentBlock = rootBlock;
     
        var locals = {};
      
        function readToken(mode, tokenString) {
            
            if(symbols[mode][tokenString]) {
                return symbols[mode][tokenString];
            }
                            
            if(mode==ContextMode.start || mode==ContextMode.incomplete) {
                if(identifierRegex.test(tokenString)) { 
                    if(funcs[tokenString]) {
                        return funcs[tokenString];
                    }
                    if(globals[tokenString]) {
                        return globals[tokenString];        
                    }
                }
                
                if(localRegex.test(tokenString)) {
                    if(!locals[tokenString]) {
                        locals[tokenString] = {tokenType: TokenType.variable, value : new LocalVariable()};    
                    }
                    return locals[tokenString];  
                }
                
                if(numberRegex.test(tokenString)) {
                    return {tokenType: TokenType.literal, value: Number(tokenString)};
                }
                if(stringRegex.test(tokenString)) {
                    return {tokenType: TokenType.literal, value: tokenString.substring(1,tokenString.length-1).replace(/(\\")/g,'"')};
                }
            }

            throw new Error(stringFormat("Unexpected token '{0}'", [tokenString]));    
        }
        
        function generateExpression(tokenStrings, start, end) {
            var builder = new ExpressionBuilder();
            
            var mode = ContextMode.incomplete;
            
            if(!start) {
                start = 0;
            }
            
            if(!end) {
                end = tokenStrings.length;
            }
            
            for(var i=start;i<end;i++) {
                var token = readToken(mode, tokenStrings[i]);
                mode = tokenTypeMode[token.tokenType];
                builder.addToken(token);
            }
                    
            if(mode!=ContextMode.complete) {
                throw new Error("Unexpected end of statement");
            }
             
            return builder.getExpression();
        }
         
        function addStatement(statement) {
            try{
                var tokenStrings = statement.match(tokenRegex);
                
                var firstToken = tokenStrings[0];
                switch(firstToken) {
                    case "if":
                        var ifBlock = new IfBlock(generateExpression(tokenStrings,1));
                        currentBlock.addLine(ifBlock);
                        blockStack.push(currentBlock);
                        currentBlock = ifBlock;
                        break;
                    case "else":
                        if(currentBlock.addCondition) {
                            if(tokenStrings[1]=="if") {
                                currentBlock.addCondition(generateExpression(tokenStrings,2));
                            } else {
                                currentBlock.addCondition(null);
                            }
                        } else {
                            throw new Error("Unexpected statement");
                        }
                        break;
                    case "foreach":
                        var i = 1;
                        while(tokenStrings[i]!="in") {
                            i++;
                            if(i == tokenStrings.length) {
                                throw new Error("Expected 'in'");
                            }                            
                        }
                        var elementExpression = generateExpression(tokenStrings,1,i);
                        var valuesExpression = generateExpression(tokenStrings,i+1);
                        var block = new FunctionBlock(foreachFunction, [elementExpression,valuesExpression]);
                        currentBlock.addLine(block);
                        blockStack.push(currentBlock);
                        currentBlock = block;
                        break;
                    case "end":
                        if(tokenStrings.length > 1) {
                            throw new Error("Unexpected tokens after 'end'");
                        }
                        if(blockStack.length==0) {
                            throw new Error("Unexpected statement");
                        }
                        currentBlock = blockStack.pop();
                        break;
                    default:
                        var expression = generateExpression(tokenStrings);
                        if(expression.block) {
                            currentBlock.addLine(expression.block);
                            blockStack.push(currentBlock);
                            currentBlock = expression.block;
                        } else {
                            currentBlock.addLine(expressionLine(expression,statement));  
                        }					                  
                }
            } catch(error) {
                throw new Error(stringFormat("Unable to parse statement '{0}':\n{1}", [statement, error.message]));
            }          
        }
        
        var lines = code.match(lineRegex);
                
        for(var i=0; i<lines.length; i++) {
            var line = lines[i];
            if(statementRegex.test(line)) {
                addStatement(line.substring(1, line.length-1));            
            } else {
                currentBlock.addLine(htmlLine(line.replace(/\[\[/g,"[").replace(/\]\]/g,"]")));      
            }
        }
       
        return rootBlock;
    }
}