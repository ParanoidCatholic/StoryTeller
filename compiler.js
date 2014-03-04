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
        separator: 3,
        func: 4, 
        operator: 5,
        unaryOperator: 6,
        variable: 7,
        literal: 8,
        marker: 9
    };

    var ContextMode = {
        incomplete : 1,
        complete: 2,
        func: 3
    };

    function literalToken(value) {
        return {
            tokenType: TokenType.literal,
            value: value,
            toString: function() {return value;}
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

    function invalidAssignment(value) {
        throw "Expression cannot be assigned to";
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
                throw "Attempt to assign to literal";
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

    var marker = {tokenType: TokenType.marker, toString: function() {return "()";}};

    var leftBracket = {tokenType: TokenType.leftBracket, toString: function() {return "("}};
    var rightBracket = {tokenType: TokenType.rightBracket, toString: function() {return ")"}};
    var separator = {tokenType: TokenType.separator, toString: function() {return ","}};
    var assignmentOperator = {tokenType: TokenType.operator, precedence: 0, expression: assignmentExpression, toString: function() {return "="}};
    var equalOperator = {tokenType: TokenType.operator, precedence: 1, expression: equalExpression, operation: function(leftOperand,rightOperand) {return literalToken(leftOperand.get()==rightOperand.get());}, toString: function() {return "=="}};
    var additionOperator = {tokenType: TokenType.operator, precedence: 2, expression: additionExpression, toString: function() {return "+"}};
    var subtractionOperator = {tokenType: TokenType.operator, precedence: 2, expression: subtractionExpression, toString: function() {return "-"}};
    var multiplicationOperator = {tokenType: TokenType.operator, precedence: 3, expression: multiplicationExpression, toString: function() {return "*"}};
    var divisionOperator = {tokenType: TokenType.operator, precedence: 3, expression: divisionExpression, toString: function() {return "/"}};
    var modulusOperator = {tokenType: TokenType.operator, precedence: 3, expression: modulusExpression, toString: function() {return "%"}};
    var notOperator = {tokenType: TokenType.unaryOperator, expression: notExpression, toString: function() {return "!"}};
    var negativeOperator = {tokenType: TokenType.unaryOperator, expression: negativeExpression, toString: function() {return "negative"}};

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
    
    var funcs = {};
    
    for(var i=0; i<functions.length; i++) {
        var funcDef = functions[i];
        funcs[funcDef.name] = {tokenType: TokenType.func, operation: funcDef.operation, toString: function() {return funcDef.name;}}
    }

    var globals = {};

    for(var i=0; i<variables.length; i++) {
        var variable = variables[i];
        globals[variable.name] = {tokenType: TokenType.variable, value: variable.value, toString: function(){return variable.name}};
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
                throw "Empty expression";
            }
            if(_stack.length>1) {
                throw "Incomplete expression";
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
                    if(topTokenTypeIs([TokenType.func, TokenType.flowControl])) {
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
    var tokenRegex = /[^\$_a-zA-Z0-9\s"]|([0-9]*\.[0-9]+)|([0-9]+)|(\$?[_a-zA-Z][_a-zA-Z0-9]*)|("([^"]|\\")*")/g;

    var identifierRegex = /^[_a-zA-Z][_a-zA-Z]*$/;
    var localRegex = /^\$[_a-zA-Z][_a-zA-Z]*$/;
    var numberRegex = /^([0-9]*\.[0-9])|([0-9]+)$/;
    var stringRegex = /^"([^"]|\\")*"$/;

    function htmlLine(html) {
        return {
            execute: function(outputBuilder) {
                outputBuilder.append(html);
            }
        };
    }

    function expressionLine(expression) {
        return {
            execute: function(outputBuilder) {
                var result = expression.evaluate();
                if(result.output) {
                    outputBuilder.append(result.value);
                }
            }
        };
    }

    function CodeBlock() {
        var _lines = [];
        
        this.addLine = function(line) {
            _lines.push(line);
        }
        
        this.execute = function(outputBuilder) {   
            for(var i=0;i<_lines.length;i++) {   
                _lines[i].execute(outputBuilder);
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
                throw "Unreachable 'else' clause";
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
                        locals[tokenString] = {tokenType: TokenType.variable, value : new LocalVariable(), toString: function(){return tokenString}};    
                    }
                    return locals[tokenString];  
                }
                
                if(numberRegex.test(tokenString)) {
                    return {tokenType: TokenType.literal, value: Number(tokenString), toString: function() {return tokenString}};
                }
                if(stringRegex.test(tokenString)) {
                    return {tokenType: TokenType.literal, value: tokenString};
                }
            }

            throw stringFormat("Unexpected token '{0}'", [tokenString]);    
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
                throw "Unexpected end of statement";
            }
             
            return builder.getExpression();
        }
         
        function addStatement(statement) {
            var tokenStrings = statement.match(tokenRegex);
            
            switch(tokenStrings[0]) {
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
                        throw "Unexpected statement";
                    }
                    break;
                case "end":
                    if(tokenStrings.length > 1) {
                        throw "Unexpected tokens after 'end'";
                    }
                    if(blockStack.length==0) {
                        throw "Unexpected statement";
                    }
                    currentBlock = blockStack.pop();
                    break;
                default:
                    currentBlock.addLine(expressionLine(generateExpression(tokenStrings,0)));
            }               
        }
        
        var lines = code.match(lineRegex);
                
        for(var i=0; i<lines.length; i++) {
            var line = lines[i];
            
            if(statementRegex.test(line)) {
                addStatement(line.substring(1, line.length-1));            
            } else {
                currentBlock.addLine(htmlLine(line));      
            }
        }
       
        return rootBlock;
    }
}