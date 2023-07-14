const stringParser = {
    isActive: false,
    hasEscaped: false,
    reset() {
        this.isActive = false;
        this.hasEscaped = false;
    },
    feed(char) {
        if (char === '\\') {
            this.hasEscaped = true;
        }
        else if (char === '"') {
            let wasEscaped = this.hasEscaped;
            this.hasEscaped = false;
            if (wasEscaped) {
                return '"';
            }
            this.isActive = !this.isActive;
        }
        return char;
    }
};

class MUDTextParser {
    constructor(plainMessage) {
        stringParser.reset();
        this.doNotStoreChar = false;
        this.prevChar = undefined;
        this.thisChar = undefined;
        this.nextChar = undefined;

        this.substitutionEngaged = false;
        this.escapeEngaged = false;
        this.hyphenatedLineBreak = false;

        this.plainMessage = plainMessage;
        
        this.contents = '';
        this.isDone = false;
    }

    getTabCount() {
        return 0;
    }

    getTabbedLine() {
        let res = '\n';
        for (let i = 0; i < this.getTabCount(); i++) {
            res += '  ';
        }
        return res;
    }

    preFeedProc(inChar, nextChar) {
        if (!this.doNotStoreChar) {
            this.prevChar = this.thisChar;
        }

        this.doNotStoreChar = false;
        this.thisChar = stringParser.feed(inChar);
        this.nextChar = nextChar;
    }

    preFeed() {
        //
    }

    feedSimple() {
        if (this.substitutionEngaged) {
            if (this.thisChar === 'c') {
                // Do line breaks
                this.contents += this.getTabbedLine();
            }
            else {
                // Preserve substitutions
                this.contents += '%' + this.thisChar;
            }
            this.substitutionEngaged = false;
            return true;
        }
        if (this.thisChar === '%') {
            // We are getting ready to store something.
            this.substitutionEngaged = true;
            return true;
        }
        if (this.thisChar === '-' && this.nextChar === '\n') {
            // This is a line hyphen. Ignore it.
            this.doNotStoreChar = true;
            this.hyphenatedLineBreak = true;
            return true;
        }
        if (this.thisChar === '\n') {
            if (
                !this.hyphenatedLineBreak &&
                (this.plainMessage || stringParser.isActive)
            ) {
                this.contents += ' ';
            }
            else {
                // Ignore white spaces in code
                this.doNotStoreChar = true;
            }
            this.hyphenatedLineBreak = false;
            return true;
        }
        if (this.thisChar.match(whitespaceRegEx)) {
            if (this.plainMessage || stringParser.isActive) {
                this.contents += ' ';
            }
            else {
                this.doNotStoreChar = true;
            }
            return true;
        }
        if (this.escapeEngaged) {
            this.escapeEngaged = false;
            this.contents += this.thisChar;
            return true;
        }
        return false;
    }

    feed() {
        this.contents += this.thisChar;
    }

    feedProc(inChar, nextChar) {
        this.preFeedProc(inChar, nextChar);
        this.preFeed();

        // Handle non-string escapes
        if (!stringParser.isActive && stringParser.hasEscaped) {
            this.escapeEngaged = true;
            return;
        }

        if (!this.feedSimple()) {
            this.feed();
        }
    }

    processStr(str) {
        for (let i = 0; i < str.length; i++) {
            let nextChar = undefined;
            if (i < str.length - 1) {
                nextChar = str.charAt(i + 1);
            }
            this.feedProc(str.charAt(i), nextChar);
            if (this.isDone) break;
        }
        this.isDone = true;
        return this.contents;
    }
}

class MUDTextCondenser {
    constructor(plainMessage) {
        this.plainMessage = plainMessage;
        this.contents = '';
        this.inString = false;
        this.isEscaping = false;
        this.nestLayer = 0;
    }

    notFunction() {
        return this.inString || this.plainMessage;
    }

    processStr(str) {
        const lines = str.split('\n');
        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            let line = lines[lineNum];
            if (!this.notFunction() && line[0].trimStart() === '#') {
                // This is a comment. Skip it.
                continue;
            }
            if (lineNum > 0) {
                if (this.notFunction()) {
                    this.contents += '%c';
                }
                if (!this.plainMessage) {
                    line = line.trim();
                }
            }
            for (let i = 0; i < line.length; i++) {
                let char = line.charAt(i);
                if (char === '\\') {
                    this.isEscaping = true;
                    this.contents += '\\';
                }
                else {
                    if (char.match(whitespaceRegEx)) {
                        if (
                            this.inString ||
                            this.plainMessage
                        ) {
                            this.contents += ' ';
                        }
                    }
                    else {
                        if (char === '"') {
                            if (!this.isEscaping) {
                                this.inString = !this.inString;
                            }
                            this.contents += char;
                        }
                        else if (!this.notFunction()) {
                            if (char != ';') {
                                this.contents += char;
                            }

                            if (char === '(') {
                                this.nestLayer++;
                            }
                            else if (char === ')') {
                                this.nestLayer--;
                                if (this.nestLayer <= 0) {
                                    this.nestLayer = 0;
                                    let isFinalParen = true;
                                    if (lineNum < lines.length - 1) {
                                        isFinalParen = false;
                                    }
                                    if (i < line.length - 1) {
                                        if (line[i + 1] === ';') {
                                            // Semicolon is already there
                                            isFinalParen = true;
                                        }
                                    }
                                    if (!isFinalParen) {
                                        this.contents += ';';
                                    }
                                }
                            }
                            else if (char === ';') {
                                if (i > 0 && this.nestLayer <= 0) {
                                    this.nestLayer = 0;
                                    if (
                                        line[i - 1] === ')' &&
                                        lineNum < lines.length - 1
                                    ) {
                                        this.contents += char;
                                    }
                                }
                            }
                        }
                        else {
                            this.contents += char;
                        }
                    }
                    this.isEscaping = false;
                }
            }
        }
        return this.contents;
    }
}

class MUDMessageParser extends MUDTextParser {
    constructor() {
        super(true);
    }
}

class MUDCodeParser extends MUDTextParser {
    constructor() {
        super(false);
        this.currentTabCount = 0;
    }

    getTabCount() {
        return this.currentTabCount;
    }

    feed() {
        if (stringParser.isActive) {
            this.contents += this.thisChar;
        }
        else if (this.thisChar === '(') {
            this.contents += '(';
            this.currentTabCount++;
            if (this.nextChar != ')') {
                this.contents += this.getTabbedLine();
            }
        }
        else if (this.thisChar === ')') {
            this.currentTabCount--;
            this.contents += this.getTabbedLine();
            this.contents += ')';
        }
        else if (this.thisChar === ';') {
            //this.contents += ';';
            this.contents += this.getTabbedLine();
        }
        else if (this.thisChar === ',') {
            this.contents += ', ';
        }
        else if (this.thisChar === '{' || this.thisChar === '}') {
            if (!(this.lastChar === ',' || this.lastChar === '(')) {
                this.contents += ' ';
            }
            this.contents += this.thisChar;
            if (!(this.nextChar === ',' || this.nextChar === '(')) {
                this.contents += ' ';
            }
        }
        else {
            this.contents += this.thisChar;
        }
    }
}

const macroScanner = {
    sourceStr: '',
    foundMacro: false,
    macroName: 'none',
    mainIndex: 0,
    nameStart: 0,
    nameEnd: 0,
    parenOpen: 0,
    parenClose: 0,
    nestLevel: 0,
    inString: false,
    isEscaping: false,
    reset(sourceStr) {
        this.sourceStr = sourceStr;
        this.foundMacro = false;
        this.mainIndex = -1;
        this.nestLevel = 0;
        this.inString = false;
        this.isEscaping = false;
    },
    findNext() {
        this.foundMacro = false;
        while(!this.found('@', undefined)) {
            if (this.handledAll()) return false;
        }
        this.nameStart = this.mainIndex + 1;
        while(!this.found('(', undefined)) {
            if (this.handledAll()) return false;
        }
        this.nameEnd = this.mainIndex;
        this.macroName = this.sourceStr.substring(this.nameStart, this.nameEnd);
        this.parenOpen = this.mainIndex + 1;
        let macroNestLevel = this.nestLevel - 1; // +1 happens before found() returns
        while(!this.found(')', macroNestLevel)) {
            if (this.handledAll()) return false;
        }
        this.parenClose = this.mainIndex;
        // Pull main index back to search internals of function,
        // if available.
        this.mainIndex = this.parenOpen - 1;
        this.nestLevel = macroNestLevel + 1;
        if (this.mainIndex + 1 === this.parenClose) {
            // Parentheses are apparently empty.
            // Skip them.
            this.mainIndex++;
            this.nestLevel--;
        }
        this.foundMacro = true;
        return true;
    },
    handledAll() {
        return this.mainIndex >= this.sourceStr.length;
    },
    found(char, goalNextLevel) {
        this.mainIndex++;
        if (this.handledAll()) return false;
        let foundChar = this.sourceStr[this.mainIndex];
        if (foundChar === '\\') {
            this.isEscaping = true;
        }
        else {
            if (foundChar === '"') {
                if (!this.isEscaping) {
                    this.inString = !this.inString;
                }
            }
            this.isEscaping = false;
        }

        // Do not read from strings
        if (this.inString) return false;

        let matchingLevel = true;
        if (goalNextLevel != undefined) {
            matchingLevel = false;
        }
        if (foundChar === '(') {
            if (this.nestLevel === goalNextLevel) {
                matchingLevel = true;
            }
            this.nestLevel++;
        }
        else if (foundChar === ')') {
            this.nestLevel--;
            if (this.nestLevel === goalNextLevel) {
                matchingLevel = true;
            }
        }
        return foundChar === char && matchingLevel;
    }
}

const alphaNumRegEx = /^[0-9a-zA-Z]+$/;
const whitespaceRegEx = /^\s+$/;
const functionStrRegEx = /^(?:\s*#.*\n)*\s*@/;

function getDebugChar(char) {
    if (char === '\n') return '\\n';
    if (char.match(whitespaceRegEx)) return '(space)';
    return char;
}

function isStringFunction(srcString) {
    return srcString.match(functionStrRegEx);
}

function convertRawToFormatted(srcString) {
    if (isStringFunction(srcString)) {
        //console.log('Raw is function.');
        return (new MUDCodeParser()).processStr(srcString);
    }
    //console.log('Raw is not function.');
    return (new MUDMessageParser()).processStr(srcString);
}

class CompileOperation {
    constructor(opTypeName, macroNameMatch) {
        this.macroNameMatch = macroNameMatch;
        this.opType = opTypeName;
        this.firstIndex = macroScanner.nameStart - 1;
        this.lastIndex = macroScanner.parenClose + 1;
        this.injectionIndex = macroScanner.parenOpen;
    }

    execute(condensedCode, headEndIndex, dbref) {
        //
    }

    getInstance() {
        return new CompileOperation('null', '');
    }
}

class MyInjectionOperation extends CompileOperation {
    constructor() {
        super('myInjection', 'my');
    }

    execute(condensedCode, headEndIndex, dbref) {
        let beforeName = condensedCode.substring(
            headEndIndex, this.firstIndex
        );
        let afterInjection = condensedCode.substring(
            this.injectionIndex, this.lastIndex
        );
        return beforeName + '@getfield(' + '"' + dbref + '"'
            + ',' + afterInjection;
    }

    getInstance() {
        return new MyInjectionOperation();
    }
}

class DoWrapOperation extends CompileOperation {
    constructor() {
        super('doWrap', 'do');
    }

    execute(condensedCode, headEndIndex, dbref) {
        let beforeWrap = condensedCode.substring(
            headEndIndex, this.firstIndex
        );
        let functionName = condensedCode.substring(
            this.injectionIndex, this.lastIndex - 1
        );
        return beforeWrap + '@execute(@getfield(' + '"' + dbref + '"'
            + ',' + functionName + '))';
    }

    getInstance() {
        return new DoWrapOperation();
    }
}

class RenameOperation extends CompileOperation {
    constructor(from, to) {
        super('rename', from);
        this.to = to;
        this.firstIndex = macroScanner.nameStart;
        this.lastIndex = macroScanner.nameEnd;
    }

    execute(condensedCode, headEndIndex, dbref) {
        let beforeRename = condensedCode.substring(
            headEndIndex, this.firstIndex
        );
        return beforeRename + this.to;
    }
}

class GetPlayerRename extends RenameOperation {
    constructor() {
        super('getplayer', 'player');
    }

    getInstance() {
        return new GetPlayerRename();
    }
}

class GetLocationRename extends RenameOperation {
    constructor() {
        super('getlocation', 'location');
    }

    getInstance() {
        return new GetLocationRename();
    }
}

class GetRoomRename extends RenameOperation {
    constructor() {
        super('getroom', 'toploc');
    }

    getInstance() {
        return new GetRoomRename();
    }
}

class GetTopLocRename extends RenameOperation {
    constructor() {
        super('gettoploc', 'toploc');
    }

    getInstance() {
        return new GetTopLocRename();
    }
}

const macroOperations = [
    new MyInjectionOperation(),
    new DoWrapOperation()
];

const renameOperations = [
    new GetPlayerRename(),
    new GetLocationRename(),
    new GetRoomRename(),
    new GetTopLocRename()
];

function processOperations(dbref, condensedCode, possibleOperations) {
    let res = '';
    const operations = [];
    macroScanner.reset(condensedCode);
    while (macroScanner.findNext()) {
        /*console.log('' +
            macroScanner.macroName +
            ' from ' + macroScanner.parenOpen +
            ' to ' + macroScanner.parenClose +
            ' : ' + macroScanner.sourceStr.substring(
                macroScanner.parenOpen, macroScanner.parenClose
            ) + ' | ' +
            macroScanner.sourceStr.substring(
                macroScanner.nameStart - 1, macroScanner.parenClose + 1
            )
        );*/
        for (let i = 0; i < possibleOperations.length; i++) {
            if (macroScanner.macroName === possibleOperations[i].macroNameMatch) {
                operations.push(possibleOperations[i].getInstance());
                break;
            }
        }
    }

    if (operations.length === 0) {
        return condensedCode;
    }
    else {
        for (let i = 0; i < operations.length; i++) {
            const op = operations[i];
            let headEndIndex = 0;
            if (i > 0) {
                headEndIndex = operations[i - 1].lastIndex;
            }
            res += op.execute(
                condensedCode, headEndIndex, dbref
            );
        }
        res += condensedCode.substring(
            operations[operations.length - 1].lastIndex,
            condensedCode.length
        );
    }
    return res;
}

function convertFormattedToRaw(srcString) {
    if (isStringFunction(srcString)) {
        //console.log('Formatted is function.');
        const dbref = $('#objectReference').val();
        let res = processOperations(
            dbref,
            (new MUDTextCondenser(false)).processStr(srcString),
            macroOperations
        );
        res = processOperations(
            dbref, res, renameOperations
        );
        return res;
    }
    //console.log('Formatted is not function.');
    return (new MUDTextCondenser(true)).processStr(srcString);
}