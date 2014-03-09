function Compiler(variables, functions) {

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
        leftBracket: 1,
        rightBracket: 2,
        separator: 5,
        func: 6, 
		blockFunc: 7,
        operator: 8,
        unaryOperator: 9,
        variable: 10,
        literal: 11,
        marker: 12
    };

    var ContextMode = {
        incomplete : 1,
        complete: 2,
        func: 3
    };

    function literalToken(value) {
        return {
            tokenType: TokenType.literal,
            value: value
        }
    }

    var tokenTypeMode = [];
     
    tokenTypeMode[TokenType.leftBracket] = ContextMode.start;
    tokenTypeMode[TokenType.rightBracket] = ContextMode.complete;
    tokenTypeMode[TokenType.separator] = ContextMode.start;
    tokenTypeMode[TokenType.func] = ContextMode.func; 
    tokenTypeMode[TokenType.operator] = ContextMode.incomplete;
    tokenTypeMode[TokenType.unaryOperator] = ContextMode.incomplete;
    tokenTypeMode[TokenType.variable] = ContextMode.complete;
    tokenTypeMode[TokenType.literal] = ContextMode.complete;

	function CodeBlock() {
        var _lines = [];
        
        this.addLine = function(line) {
            _lines.push(line);
        }
        
        this.execute = function(outputBuilder) {   
            for(var i=0;i<_lines.length;i++) {  
                var line = _lines[i];
                try{
                    line.execute(outputBuilder);
                } catch(error) {
                    if(line.source) {
                        throw new Error(stringFormat("Unable to execute statement '{0}':\n{1}", [line.source, error.message]));
                    }
                } 
            }
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
                        
        this.execute = function(outputBuilder) {
            for(var i=0;i<_blocks.length;i++) {
                var block = _blocks[i];
                if(block.condition == null || block.condition.evaluate().value) {
                    block.block.execute(outputBuilder);
                    return;
                }
            }
        }
    }
	        
	function FunctionBlock(func, parameters) {
		var _block = new CodeBlock();
		
		var _parameters = [_block];
		
        for(var i=0;i<parameters.length;i++) {
            var parameter = parameters[i];
            _parameters.push({
                evaluate: function(){return parameter.evaluate().value;},
                assign: parameter.assign.bind(parameter)
            });
        }
        		
        this.addLine = function(line) {
            _block.addLine(line);
        }
        
        this.execute = function(outputBuilder) {
			outputBuilder.append(func.apply(null, _parameters));
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

    function functionExpression(func,parameters) {
        return {
            evaluate: function() {
                evaluatedParameters = [];
                for(var i=0;i<parameters.length;i++) {
                    evaluatedParameters.push(parameters[i].evaluate().value)
                }
                return visible(func.apply(null,evaluatedParameters));                        
            },
            assign: invalidAssignment
        };
    }
	
	function blockFunctionExpression(func,parameters) {
        return {
			block: new FunctionBlock(func, parameters),
            evaluate: function() {
                throw new Error("Block functions cannot be evaluated in a statement.");                       
            },
            assign: invalidAssignment
        };
    }

    var marker = {tokenType: TokenType.marker};

    var leftBracket = {tokenType: TokenType.leftBracket};
    var rightBracket = {tokenType: TokenType.rightBracket};
    var separator = {tokenType: TokenType.separator};
    var assignmentOperator = {tokenType: TokenType.operator, precedence: 0, expression: assignmentExpression};
    var equalOperator = {tokenType: TokenType.operator, precedence: 1, expression: equalExpression};
    var additionOperator = {tokenType: TokenType.operator, precedence: 2, expression: additionExpression};
    var subtractionOperator = {tokenType: TokenType.operator, precedence: 2, expression: subtractionExpression};
    var multiplicationOperator = {tokenType: TokenType.operator, precedence: 3, expression: multiplicationExpression};
    var divisionOperator = {tokenType: TokenType.operator, precedence: 3, expression: divisionExpression};
    var modulusOperator = {tokenType: TokenType.operator, precedence: 3, expression: modulusExpression};
    var notOperator = {tokenType: TokenType.unaryOperator, expression: notExpression};
    var negativeOperator = {tokenType: TokenType.unaryOperator, expression: negativeExpression};

    var symbols = [];

    symbols[ContextMode.start] = {
        "(" : leftBracket,
        "-" : negativeOperator,
        "not" : notOperator   
    };

    symbols[ContextMode.complete] = {
        ")" : rightBracket,
        "," : separator,
        "=" : assignmentOperator,
        "equal" : equalOperator,
        "+" : additionOperator,
        "-" : subtractionOperator,    
        "*" : multiplicationOperator,
        "/" : divisionOperator,
        "%" : modulusOperator
    };

    symbols[ContextMode.incomplete] = symbols[ContextMode.start];

    symbols[ContextMode.func] = {
        "(" : leftBracket
    };
        
    var globals = {};

    for(var i=0; i<variables.length; i++) {
        var variable = variables[i];
        globals[variable.name] = {tokenType: TokenType.variable, value: variable.value};
    }

	var funcs = {};
    
    for(var i=0; i<functions.length; i++) {
        var funcDef = functions[i];
		if(funcDef.blockFunction) {
			funcs[funcDef.name] = {tokenType: TokenType.blockFunc, operation: funcDef.operation}
		} else {
			funcs[funcDef.name] = {tokenType: TokenType.func, operation: funcDef.operation}
		}
    }
			
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
                    var parameters = [];
                    var parameter;
                    while((parameter=_stack.pop())) {
                        parameters.push(parameter);
                    }
                    _stack.push(functionExpression(token.operation,parameters.reverse()));                
                    break;
				case TokenType.blockFunc:
                    var parameters = [];
                    var parameter;
                    while((parameter=_stack.pop())) {
                        parameters.push(parameter);
                    }
                    _stack.push(blockFunctionExpression(token.operation,parameters.reverse()));
                    break;
                case TokenType.literal:
                    _stack.push(literalExpression(token.value));
                    break;
                case TokenType.variable:
                    _stack.push(variableExpression(token.value));
                    break;
                case TokenType.marker:
                    _stack.push(null);
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
                case TokenType.leftBracket:
                    _stack.push(token);
                    break;
                case TokenType.rightBracket:
                    while(!topTokenTypeIs([TokenType.leftBracket])) {
                        _builder.addToken(_stack.pop());
                    }
                    _stack.pop();
                    if(topTokenTypeIs([TokenType.func, TokenType.blockFunc])) {
                        _builder.addToken(_stack.pop());
                    }
                    break;
                case TokenType.separator:
                    while(!topTokenTypeIs([TokenType.leftBracket])) {
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
                    _builder.addToken(marker);
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

    var lineRegex = /((\[\[)|([^[]))+|(\[[^\]]*\])/g;
    var statementRegex = /^\[[^\[]/;
    var tokenRegex = /[^\$_a-zA-Z0-9\s"]|([0-9]*\.[0-9]+)|([0-9]+)|(\$[_a-zA-Z0-9]+)|([_a-zA-Z][_a-zA-Z0-9]*)|("([^"]|\\")*")/g;

    var identifierRegex = /^[_a-zA-Z][_a-zA-Z0-9]*$/;
    var localRegex = /^\$[_a-zA-Z0-9]+$/;
    var numberRegex = /^([0-9]*\.[0-9])|([0-9]+)$/;
    var stringRegex = /^"([^"]|\\")*"$/;

    function htmlLine(html) {
        return {
            execute: function(outputBuilder) {
                outputBuilder.append(html);
            }
        };
    }

    function expressionLine(expression, source) {
        return {
            execute: function(outputBuilder) {
                var result = expression.evaluate();
                if(result.output) {
                    outputBuilder.append(result.value);
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
                    return {tokenType: TokenType.literal, value: tokenString.substring(1,tokenString.length-1)};
                }
            }

            throw new Error(stringFormat("Unexpected token '{0}'", [tokenString]));    
        }
        
        function generateExpression(tokenStrings, start) {
            var builder = new ExpressionBuilder();
            
            var mode = ContextMode.incomplete;
            
            for(var i=start;i<tokenStrings.length;i++) {
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
                        var expression = generateExpression(tokenStrings,0);
                        if(expression.block) {
                            currentBlock.addLine(expression.block);
                            blockStack.push(currentBlock);
                            currentBlock = expression.block;
                        } else {
                            currentBlock.addLine(expressionLine(generateExpression(tokenStrings,0),statement));  
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