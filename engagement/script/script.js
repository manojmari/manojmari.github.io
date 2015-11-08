$(document).ready(function(){
	loadXmlAndContinue();
	$('#inputName').focus();
});

function loadXmlAndContinue(){
	$.ajax({
    type: "GET",
    url: "data/data.xml",
    dataType: "xml",
    success: function (xml) {
        var xmlDoc = $.parseXML(xml);
        $(document).data('xml', xml);
        createGroups($(xml).find('groups').children());
        createFriends($(xml).find('friends').children());
        loadInteractive();
    }
	});
}

function loadInteractive(){
	var friends = $(document).data('friends'),
		friendNames = _.pluck(friends, 'name');	
	$( "#inputName" ).autocomplete({ source: friendNames, delay: 100 });
	$('.form-signin').submit(submitName);
}

function noSuchFriend(){
	$('#warning').html("Wow! You should really tell your real name to Mari-cheeto!!!")
	$('#suggestions').html("");
	$(warningContainer).fadeIn();
	return false;
}

function submitName(event){
	event.preventDefault()
	var name = $('#inputName').val();
	var friends = $(document).data('friends'),
		friend = _.find(friends, function(curr){
			return curr.name.toLowerCase() == name.toLowerCase()
		});
console.log(friends)
	if(friend == undefined)
		return noSuchFriend();

	var other = friend.other;
	if(!_.isString(other))
		return loadDragDrop(name);
	if(_.isEmpty(other = other.trim()))
		return loadDragDrop(name);
	
	var otherNames = other.split(',');

	var htmlSuggestions = _.map(otherNames, function(currentName){
		return '<button type="button" class="abc">' + currentName + '</button>';
	}).join('');
        
	console.log(htmlSuggestions)
	$('#suggestions').html(htmlSuggestions);
	$('#warning').html("Did you mean?");
	$('#warningContainer').fadeIn();
	$('.abc').click(function(){
		return loadDragDrop(name);
	})
	return false;
}

function loadFutureImages(friend){
	var index = 0;
	_.each(friend.images, function(currImg){
		var imgDom = document.createElement('img');
		imgDom.src = 'data/images/' + currImg.file;
		imgDom.id = 'img_' + index;
		imgDom.className = 'imgShow_imgs';
		if(index ==0)
			imgDom.style.display = 'inline';
		$('#imageShow').append(imgDom);
		index++;
	});
	$('#imageShow').data({'current' : 0 ,'maxIndex' : index });
	$('#leftNav').click(showLeft);
	$('#rightNav').click(showRight);

	//var maxIndex = $('#imageShow').data();
}

function loadDragDrop(name){
	var friends = $(document).data('friends'),
		groups = $(document).data('groups'),
		friend = _.find(friends, function(curr){
			return curr.name.toLowerCase() == name.toLowerCase()}),
		group = _.find(groups, {id: friend.group});

	loadFutureImages(friend);
	$('#user-info').hide();
	$('#dragDrop').show();
	var puzzleHtml = "";
	var referenceHtml = "";

	for(var i = 0; i<3 ; i++){
		for(var j = 0; j<3 ; j++){
			var backPosX = j * 150;
			var backPosY = i * 150;
			puzzleHtml += "<div class='puzzlePiece tiles positionRelative' style='"
			+" background-position:-" + backPosX+ "px -" + backPosY+ "px;"
			+"-webkit-mask-image: url(data/svg/" + i + j + ".svg);' dragId="+i+j+"></div>";
			referenceHtml += "<img class='tiles droppables'  dropId="+i+j+" style='top:" + (i * 150) + "px;left:" + (j * 150) + "px' src='data/svg/" + i + j + ".svg' />"
		}	
	}
	console.log(puzzleHtml)
	$('#draggableContainer').html(puzzleHtml);
	$('#referenceTiles').html(referenceHtml);
	var draggablePieces = $('.puzzlePiece').css("background-image", "url('data/images/" + group.file + "')").draggable({
		revert: 'invalid',
		drag: function() {
	        $(this).css('z-index', 10);
	    },
	    stop: function() {
	        $(this).css('z-index', 1);
	    }
	});
	shuffle(draggablePieces);
	_.each(draggablePieces, function(currentDraggable, index){
			$('#draggableContainer').append(currentDraggable);
	})
	$('.droppables').droppable({
		accept: function(event){
			return $(event).attr('dragId') === $(this).attr('dropId')
		},
		drop: function(event, ui){
			var dropId = $(this).attr('dropId');
			var y = parseInt(dropId.charAt(0))
			var x = parseInt(dropId.charAt(1))
			$('#draggableResultContainer').append(ui.draggable);
			$(ui.draggable).css({top: y*150+'px', left: x*150+'px'}).draggable({'disabled': true}).removeClass('positionRelative');
			if($('#draggableResultContainer').children().length == 10){
				$('#dragResultText').html("So " + name + " you DO remember this picture!! Come, let's checkout some more...");
				$('#draggableContainer').slideUp(function(){
					$('#dragDropResult').slideDown();
					$('#imageShow').fadeIn();
				});
				$(document).bind('keydown',function(e){
					if(e.keyCode == 37)
						showLeft();
					if(e.keyCode == 39)
						showRight();
				})
			}
		}
	});
	$('#draggableContainer').hide().slideDown()
	return false;
}

function showLeft(){
	var prevIndex = $('#imageShow').data('current');
	var maxIndex = $('#imageShow').data('maxIndex');
	console.log(prevIndex)

	var currentIndex = prevIndex - 1
	if(currentIndex == -1)
		currentIndex = maxIndex - 1;
	console.log(currentIndex)
	console.log(maxIndex)
	$('#img_' + prevIndex).hide("slide", { direction: "right" }, 300, function(){
	});
		$('#img_' + currentIndex).show("slide", { direction: "left" }, 300);
	$('#imageShow').data({'current': currentIndex});
}

function showRight(){
	var prevIndex = $('#imageShow').data('current');
	var maxIndex = $('#imageShow').data('maxIndex');

	var currentIndex = prevIndex + 1
	if(currentIndex == maxIndex)
		currentIndex = 0;
	console.log(currentIndex)
	console.log(maxIndex)
	$('#img_' + prevIndex).hide("slide", { direction: "left" }, 300, function(){
	});
		$('#img_' + currentIndex).show("slide", { direction: "right" }, 300);
	$('#imageShow').data({'current': currentIndex});
}

function renderAttributes(oThis){
	var currentObject = {};
	$.each(oThis.attributes, function(i, attrib){
    	currentObject[attrib.name] = attrib.value;
	});
	return currentObject;
}

function createGroups(groups){
	var arrGroup = [];
	groups.each(function(){
  		arrGroup.push(renderAttributes(this));
	})
	$(document).data('groups', arrGroup);
}

function createFriends(friends){
	var arrFriends = [];
	friends.each(function(){
		var currentFriend = renderAttributes(this);
		currentFriend['images'] = [];
		console.log($(this).children())
		$(this).children().each(function(){
			currentFriend.images.push(renderAttributes(this));
		});
  		arrFriends.push(currentFriend);
	})
	$(document).data('friends', arrFriends);
}

function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex ;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}