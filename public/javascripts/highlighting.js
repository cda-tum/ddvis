
let lineHighlight = "<mark>                                                                                                                                  </mark>";
//let lineHighlight = "<mark>      </mark>";

function updateLineHighlight(newLH) {
    lineHighlight = newLH;
}


class HighlightManager {
    _div;
    _isOperation;
    _hl;    //an array that tells us for each line if it is an operation or not
    _operationOffset = 0;
    _highlightedOps = 0;      //how many lines with Operations are highlighted
    _nopsInHighlighting = 0;   //how many lines of Non-Operations (comments, header) are between the first line
                              // and the last highlighted one
    _processedText = "";
    _pendingText = "";

    constructor(highlightDiv, isOperation) {
        if(highlightDiv) this._div = highlightDiv;
        else throw Error("HighlightManager needs a div to apply the highlighting to!");

        if(isOperation) this._isOperation = isOperation;
        else throw Error("HighlightManager needs a function to determine if a line is an operation!");
    }

    set text(text) {
        //calculate new operationOffset for the new text and decide for each line of the text whether
        // it is an operation (therefore will be highlighted) or not
        this._operationOffset = -1;
        const lines = text.split('\n');
        this._hl = [];
        this._p
        for(let i = 0; i < lines.length; i++) {
            if(this._operationOffset < 0) {             //operation offset hasn't been found yet
                if(this._isOperation(lines[i])) {
                    //we found the first operation so the offset is one line before the current one
                    this._operationOffset = i-1;
                    this._hl.push(true);

                } else this._hl.push(false);

            } else this._hl.push(this._isOperation(lines[i]));
        }

        this._pendingText = "";
        const pendingLines = lines.length - (this._highlightedOps + this._nopsInHighlighting);
        for(let i = 0; i < pendingLines; i++) {
            this._pendingText += "\n";
        }
    }

    get offset() {
        return this._operationOffset;
    }

    get highlightedLines() {
        return this._highlightedOps;
    }

    set highlightedLines(l) {
        this._highlightedOps = l;
    }

    get nopsInHighlighting() {
        return this._nopsInHighlighting;
    }

    isHighlighted(i) {
        if(i < this._highlightedOps + this._nopsInHighlighting)
            return this._hl[i];
        else return false;  //line is definitely not highlighted (yet)
    }

    resetHighlighting(newText) {
        this._highlightedOps = 0;
        this._nopsInHighlighting = 0;
        this._processedText = "";

        this.text = newText;

        //todo reset content of div?
    }

    initialHighlighting() {
        this._highlightedOps = 0;
        this._processedText = "";   //just highlight the first line giving information about the format
        this._pendingText = "";
        this._hl.forEach(l => this._pendingText += "\n");
        this._nopsInHighlighting = 0;
        this._div.html(lineHighlight + this._pendingText);  //special case so not the usual updateDiv()
    }

    increaseHighlighting() {
        //debugger
        //add possible nops between the highlighting and next operation
        for(let i = this._highlightedOps + this._nopsInHighlighting;
            i < this._hl.length && !this._hl[i];    //abort as soon as we have found the next operation
            i++) {
            this._addProcessedLine();
            this._removePendingLine();

            this._nopsInHighlighting++;
        }

        this._addProcessedLine(lineHighlight);
        this._removePendingLine();
        this._highlightedOps++;

        this._updateDiv();
    }


    decreaseHighlighting() {
        //remove possible nops inside the highlighting
        for(let i = this._highlightedOps + this._nopsInHighlighting - 1; //-1 because we want the last highlighted line, not the potential next one
            i >= 0 && !this._hl[i];    //abort as soon as we have found the last operation
            i--) {
            this._removeProcessedLine();
            this._addPendingLine();

            this._nopsInHighlighting--;
        }

        this._removeProcessedLine();
        this._addPendingLine();
        this._highlightedOps--;

        if(this._highlightedOps === 0) {
            this.initialHighlighting();
            /* //more efficient approach, because we don't have to iterate over the whole hl, but it would need more testing I think
            this._nopsInHighlighting = 0;
            this._pendingText += this._processedText;
            this._processedText = "";
            this._div.html(lineHighlight + this._pendingText);  //special case so not the usual updateDiv()
            */
        } else this._updateDiv();
    }

    highlightEverything() {
        //hl.length-1 because the last line is always \n and has nothing to do with the algorithm
        for(let i = this._highlightedOps + this._nopsInHighlighting; i < this._hl.length-1; i++) {
            if(this._hl[i]) {
                this._addProcessedLine(lineHighlight);
                this._highlightedOps++;
            } else {
                this._addProcessedLine();
                this._nopsInHighlighting++;
            }
        }

        this._pendingText = "";
        this._updateDiv();
    }

    setHighlights() {
        if(this._highlightedOps === 0) {  //special case for "no highlighting yet"
            this.initialHighlighting();

        } else {
            this._processedText = "";
            this._pendingText = "";
            let opLines = 0;
            let nopLines = 0;
            let i;
            for(i = 0; i < this._hl.length; i++) {
                if(opLines < this._highlightedOps) {  //highlighting may still be applied
                    if(this._hl[i]) {   //this is a line with an operation
                        opLines++;
                        this._processedText += lineHighlight;
                    } //else this is a line without highlighting
                    else nopLines++;
                    this._processedText += "\n";
                } else this._pendingText += "\n";
            }

            this._nopsInHighlighting = nopLines;
            this._updateDiv();
        }

    }

    _updateDiv() {
        this._div.html(this._processedText + this._pendingText);
    }

    _addProcessedLine(line) {
        line = line || "";
        this._processedText += line + "\n";
    }

    _removeProcessedLine() {
        //length-1 would start at the end, but we want to skip the \n at the very end which is interpreted as 1 character
        const index = this._processedText.lastIndexOf("\n", this._processedText.length-2);
        this._processedText = this._processedText.substring(0, index+1); //+1 because we still need the \n we found with lastIndexOf
        //this needs to be done so "complicated" because we don't know if there is <mark>...</mark> between the last two
        // "\n"s and we can't say for sure how long the mark is, because the size might have been updated in the meantime
    }

    _addPendingLine() {
        this._pendingText += "\n";
    }

    _removePendingLine() {
        this._pendingText = this._pendingText.substring(1); //remove one \n
    }

}