var snakeList = new Array();
var boostLeft, boostTop;
var maxTop, maxLeft;
var currentActiveSnake;
var intervalId;
var collisionCheck;
var direction = {
    left: 0,
    right: 1,
    up: 3,
    down: 4
};

function Snake() {
    this.head = null;
    this.length = 0;
    this.paused = false;
    this.directions = new Array();
}

function Block() {
    this.direction = direction.right;
    this.next = null;
    this.left = 0;
    this.top = 0;
    this.htmlElement = null;
}

function fncBodyLoaded() {
    var iWindowHeight = parseInt(getStyleAttr('divMainWindow', "height").replace('px', ''));
    var iWindowWidth = parseInt(getStyleAttr('divMainWindow', "width").replace('px', ''));

    var divBlock = document.createElement('div');
    divBlock.className += " divBlock";

    var oBlock = new Block();
    oBlock.htmlElement = divBlock;
    oBlock.left = 2;
    oBlock.top = 0;
    oBlock.direction = direction.down;
    document.getElementById('divMainWindow').appendChild(divBlock);

    maxLeft = Math.floor(iWindowWidth / divBlock.offsetWidth);
    maxTop = Math.floor(iWindowHeight / divBlock.offsetHeight);
    collisionCheck = new Array(maxTop + 1)
    for (var i = 0; i <= maxTop; i++) {
        collisionCheck[i] = new Array(maxLeft + 1);
    }

    var oSnake = new Snake();
    oSnake.head = oBlock;
    divBlock = document.createElement('div');
    divBlock.className += " divBlock";

    oBlock = new Block();
    oBlock.htmlElement = divBlock;
    oBlock.left = 1;
    oBlock.top = 0;
    oBlock.direction = direction.right;
    document.getElementById('divMainWindow').appendChild(divBlock);

    divBlock = document.createElement('div');
    divBlock.className += " divBlock";

    var oBlock2 = new Block();
    oBlock2.htmlElement = divBlock;
    oBlock2.left = 0;
    oBlock2.top = 0;
    oBlock2.direction = direction.right;
    document.getElementById('divMainWindow').appendChild(divBlock);

    oBlock.next = oBlock2;
    oSnake.head.next = oBlock;
    oSnake.length = 3;
    oSnake.directions.push(direction.down);
    console.log('here');

    console.log(oSnake.directions);
    snakeList.push(oSnake);
    fncSetFocus(0);

    intervalId = setInterval(fncReconstruct, 100);
    document.removeEventListener('keydown', fncInitEventBinding);
    document.addEventListener('keydown', fncInitEventBinding);
    fncGenerateBoost();
}
function fncSetFocus(iSnakeId) {
    var currentSnake = snakeList[iSnakeId];
    //var oldSnake = snakeList[currentActiveSnake];
    //if (oldSnake != null)
    //    var oBlock = oldSnake.head;

    currentActiveSnake = iSnakeId;

    var oSelectedList = document.getElementsByClassName('divBlockFocus');
    while (oSelectedList.length != 0) {
        oSelectedList[0].className = oSelectedList[0].className.replace("divBlockFocus", "");
    }

    var oBlock = currentSnake.head;
    while (oBlock != null) {
        oBlock.htmlElement.className += " divBlockFocus";
        oBlock = oBlock.next;
    }
}

function fncInitEventBinding(event) {
    var currentSnake = snakeList[currentActiveSnake];
    switch (event.keyCode) {
        case 37:

            if (currentSnake.directions[currentSnake.directions.length - 1] != direction.right && currentSnake.directions[currentSnake.directions.length - 1] != direction.left) {
                currentSnake.directions.push(direction.left);
            }
            break;
        case 38:
            if (currentSnake.directions[currentSnake.directions.length - 1] != direction.down && currentSnake.directions[currentSnake.directions.length - 1] != direction.up) {
                currentSnake.directions.push(direction.up);
            }

            break;
        case 39:
            if (currentSnake.directions[currentSnake.directions.length - 1] != direction.right && currentSnake.directions[currentSnake.directions.length - 1] != direction.left) {
                currentSnake.directions.push(direction.right);
            }
            break;
        case 40:
            if (currentSnake.directions[currentSnake.directions.length - 1] != direction.down && currentSnake.directions[currentSnake.directions.length - 1] != direction.up) {
                currentSnake.directions.push(direction.down);
            }

            break;
        case 9:
            //tab
            var newFocus = (currentActiveSnake + 1) >= snakeList.length ? 0 : currentActiveSnake + 1;
            fncSetFocus(newFocus);
            break;
        case 32:
            currentSnake.paused = !currentSnake.paused;
            //space
            break;
        case 88:
            if (currentSnake.length >= 4) {
                var oBlock = currentSnake.head;
                var count = 0;
                while (count != Math.ceil(currentSnake.length / 2) - 1) {
                    oBlock = oBlock.next;
                    count++;
                }
                var oNewSnake = new Snake();
                oNewSnake.head = oBlock.next;
                oNewSnake.length = Math.floor(currentSnake.length / 2);
                oNewSnake.directions.push(oNewSnake.head.direction);
                snakeList.push(oNewSnake);

                oBlock.next = null;
                currentSnake.length = Math.ceil(currentSnake.length / 2);
                fncSetFocus(currentActiveSnake);
                fncGenerateBoost();
            }
            //x
            break;
    }
    event.preventDefault();
    event.returnValue = false;
    //return false;
}

function fncReconstruct() {

    var iWindowHeight = parseInt(getStyleAttr('divMainWindow', "height").replace('px', ''));
    var iWindowWidth = parseInt(getStyleAttr('divMainWindow', "width").replace('px', ''));

    for (var i = 0; i <= maxTop; i++) {
        for (var j = 0; j <= maxLeft; j++) {
            if (collisionCheck[i][j] != -1) {
                collisionCheck[i][j] = null;
            }
        }
    }

    for (var i = 0; i < snakeList.length; i++) {
        var oSnake = snakeList[i];

        var oBlock = oSnake.head;
        var prevDirection = null;
        var toAppend = false;

        if (oSnake.directions.length > 1) {
            oBlock.direction = oSnake.directions.shift();
        }
        else {
            oBlock.direction = oSnake.directions[0];
        }
        while (oBlock != null) {
            if (!oSnake.paused) {
                switch (oBlock.direction) {
                    case direction.up:
                        oBlock.top = oBlock.top - 1;
                        break;
                    case direction.left:
                        oBlock.left = oBlock.left - 1;
                        break;
                    case direction.down:
                        oBlock.top = oBlock.top + 1;
                        break;
                    case direction.right:
                        oBlock.left = oBlock.left + 1;
                        break;
                }
                if (oBlock.top > maxTop) {
                    oBlock.top = 0;
                }
                if (oBlock.left > maxLeft) {
                    oBlock.left = 0;
                }
                if (oBlock.left < 0) {
                    oBlock.left = maxLeft - oBlock.left - 1;
                }
                if (oBlock.top < 0) {
                    oBlock.top = maxTop - oBlock.top - 1;
                }



                if (oBlock.next == null && toAppend) {
                    var divBlock = document.createElement('div');
                    divBlock.className += " divBlock";

                    var oNewBlock = new Block();
                    oNewBlock.htmlElement = divBlock;
                    oNewBlock.left = oBlock.left;
                    oNewBlock.top = oBlock.top;
                    oNewBlock.direction = oBlock.direction;
                    switch (oBlock.direction) {
                        case direction.left:
                            oNewBlock.left += 2;
                            break;
                        case direction.right:
                            oNewBlock.left -= 2;
                            break;
                        case direction.up:
                            oNewBlock.top += 2;
                            break;
                        case direction.down:
                            oNewBlock.top -= 2;
                            break;
                    }
                    document.getElementById('divMainWindow').appendChild(divBlock);
                    oBlock.next = oNewBlock;
                    toAppend = false;
                    fncSetFocus(currentActiveSnake);
                }
                var prevDirectionBuf = prevDirection;
                prevDirection = oBlock.direction;
                if (prevDirectionBuf != null) {
                    oBlock.direction = prevDirectionBuf;
                }
                if (collisionCheck[oBlock.top][oBlock.left] == -1) {
                    toAppend = true;
                    oSnake.length++;
                    var oldBoost = document.getElementsByClassName('divBoost_' + oBlock.top + '_' + oBlock.left)[0];
                    if (oldBoost != null) {
                        document.getElementById('divMainWindow').removeChild(oldBoost);
                    }
                    collisionCheck[oBlock.top][oBlock.left] = null;
                    fncGenerateBoost();
                }
            }

            if (collisionCheck[oBlock.top][oBlock.left] == null) {
                collisionCheck[oBlock.top][oBlock.left] = oBlock.htmlElement;
                oBlock.htmlElement.style.top = (oBlock.top * oBlock.htmlElement.offsetHeight) + "px";
                oBlock.htmlElement.style.left = (oBlock.left * oBlock.htmlElement.offsetWidth) + "px";
            }
            else {
                alert('collision!!!!' + oBlock.top + " " + oBlock.left);
                clearInterval(intervalId);
                snakeList = new Array();
                document.getElementById('divMainWindow').innerHTML = "";
                fncBodyLoaded();
                return;
            }
            oBlock = oBlock.next;
        }
    }
}

function getStyleAttr(elementId, attr) {
    var element = document.getElementById(elementId);
    var style = window.getComputedStyle(element, null);
    return style.getPropertyValue(attr);
}

function fncGenerateBoost() {

    boostTop = Math.round(Math.random() * maxTop);
    boostLeft = Math.round(Math.random() * maxLeft);
    if (collisionCheck[boostTop][boostLeft] != undefined) {
        fncGenerateBoost();
        return;
    }
    collisionCheck[boostTop][boostLeft] = -1;

    var boostHtml = document.createElement('div');
    boostHtml.className += " divBoost divBoost_" + boostTop + "_" + boostLeft;
    document.getElementById('divMainWindow').appendChild(boostHtml);
    boostHtml.style.top = (boostTop * boostHtml.offsetHeight) + "px";
    boostHtml.style.left = (boostLeft * boostHtml.offsetWidth) + "px";
}