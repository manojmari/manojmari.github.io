$(document).ready(function(){
	loadXmlAndContinue();
	$('#inputName').focus();
	
});

function basicCheckFail(){
	var ua = navigator.userAgent;
	var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i.test(ua);
	var isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);

	if(isMobile){
		$('body').html('<div id="police"></div><div id="speechBubble">Now what did i tell you about not using the mobile?!?!</div>');
		return true;
	}

	if(!isChrome){
		$('body').html('<div id="police"></div><div id="speechBubble">Didn\'t I warn you about using Chrome?!?!</div>');
		return true;
	}

    return false;
}

function loadXmlAndContinue(){
	$.ajax({
    type: "GET",
    url: "data/data.xml",
    dataType: "xml",
    success: function (xml) {
    	if(basicCheckFail())
    		return;
        var xmlDoc = $.parseXML(xml);
        $(document).data('xml', xml);
        createGroups($(xml).find('groups').children());
        createFriends($(xml).find('friends').children());
        loadMp3($(xml).find('audios').children());
        var arrImages = getPreloaderImages($(xml).find('images').children());
		var allImages = getPreloaderImages($(xml).find('img'));   
		// console.log(_.clone(allImages))     
  //       preloadImages(allImages, function(){
  //       	console.log('success');
  //       })
        preloadImages(arrImages,function(){
	        loadInteractive();
	        //playSound('sym');
			$('#rope').click(function(){
				$('#rope').hide();
				$('#curtain').animate({height: "0%"}, 2000, function(){
					playSound('giorni');
					var ourArray = $('.tileShow').data('imgCount', 0);
        			tileShowAnim(shuffle(ourArray.toArray()));
        			var textForIntro = _.map($('#introTextFromHere').children(), function(currentSpan){
        				return $(currentSpan).html();
        			});
        			fncTextLoader(textForIntro);
				})
			});
        });
        $('#curtainNext').click(function(){
        	playSound('');
        	$('#intro').hide();
        	$('#user-info').show();
        });
	}
	});
}

function loadInteractive(){
	var friends = $(document).data('friends'),
		friendNames = _.pluck(friends, 'name');	

	friendNames = _.sortBy(friendNames, function(currName){
		return currName.toLowerCase();
	});
	$( "#inputName" ).autocomplete({ source: friendNames, delay: 100 });
	$('.form-signin').submit(submitName);
	
	var tileShowHtml = "";
	var tile_count =0;
	for(var i=0;i<3;i++)
		for(var j=0;j<3;j++){
			var left = j*33.33;
			var top = i*33.33;
			tileShowHtml += '<div class="tileShow" style="display:none;left:'+left+'%;top:'+top+'%;'+
			'background-image:url(\'data/images/us/'+(tile_count++)+'.jpg\');"></div>';
		}

	$('#collage').html(tileShowHtml)
}

function fncTextLoader(arrTextForIntro){
	if(arrTextForIntro == 0){
		$('#ring').show().click(function(){
			$('#intro').hide();
        	$('#user-info').show();
        });
		return;
	}
	textForIntro = arrTextForIntro[0];
	if(textForIntro.length == 0){
		arrTextForIntro.shift();
		setTimeout(function(){
			$('#introText').html("");
			fncTextLoader(arrTextForIntro);
		}, 2500);
	}
	else{
		$('#introText').html($('#introText').html()+textForIntro.charAt(0));
		arrTextForIntro[0] = textForIntro.substring(1)
		setTimeout(function(){
			fncTextLoader(arrTextForIntro);
		}, 100);
	}
}

function tileShowAnim(ourArray){

	var currentTile = ourArray.shift();
	var imgCount = $(currentTile).data('imgCount');
	$(currentTile).fadeIn(800).fadeOut(800).data('imgCount', ++imgCount);
	if(imgCount != 6)
		ourArray.push(currentTile);
	if(ourArray.length != 1){
		setTimeout(function(){
			tileShowAnim(ourArray)
		},800);
	}
	else
		$('.tileShow').stop(true,false).fadeIn(500);
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
	if(friend == undefined)
		return noSuchFriend();

	var other = friend.other;
	if(!_.isString(other))
		return preloadAndStartDragDrop(name);
	if(_.isEmpty(other = other.trim()))
		return preloadAndStartDragDrop(name);
	
	var otherNames = other.split(',');

	var htmlSuggestions = _.map(otherNames, function(currentName){
		return '<button type="button" class="abc">' + currentName + '</button>';
	}).join('');
        
	$('#suggestions').html(htmlSuggestions);
	$('#warning').html("Did you mean?");
	$('#warningContainer').fadeIn();
	$('.abc').click(function(){
		return preloadAndStartDragDrop(name);
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
		index++;
	});
	$('#imageShow').data({'current' : 0 ,'maxIndex' : index });
	
	//var maxIndex = $('#imageShow').data();
}

function preloadAndStartDragDrop(name){
	var friends = $(document).data('friends'),
		groups = $(document).data('groups'),
		friend = _.find(friends, function(curr){
			return curr.name.toLowerCase() == name.toLowerCase()}),
		group = _.find(groups, {id: friend.group});
		friend.images.unshift(group);
		$(document).data('friend', friend);
		preloadImages(_.clone(friend.images),function(){
			loadDragDrop(name, friend, group);
		}, true)
}

function loadDragDrop(name, friend, group){
	
	//loadFutureImages(friend);
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
			+"-webkit-mask-image: url(data/images/" + i + j + ".svg);' dragId="+i+j+"></div>";
			referenceHtml += "<img class='tiles droppables'  dropId="+i+j+" style='top:" + (i * 150) + "px;left:" + (j * 150) + "px' src='data/images/" + i + j + ".svg' />"
		}	
	}
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
				/*
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
				*/
				startWalter();
			}
		}
	});
	$('#draggableContainer').hide().slideDown()
	return false;
}

function startWalter(){
	$('#header').html("YOU'RE GODDAMN RIGHT!!");
	$('#toHideDrag').hide();
	$('#album').fadeIn(function(){
		playSound('walter', endWalter);
	});
	$('#imgMain').css({'max-height':($('#album_table').height()-100), 'max-width':$('#album_table').width()})
	$('#imgMain').attr('src', 'data/images/walter.png');
	$('#imgMain').addClass('walterNoBorder');
	
}

function endWalter(){
	$('#header').html('Now, <button id="" class="clickMe btn btn-lg btn-primary btn-block" onclick="loadAlbum()">CLICK ME</button>' + 
		' and better remember the days we spent!');
}

function loadAlbum(){
	$('#imgMain').removeClass('walterNoBorder');
	$('#header').html("Keep looking, your invitation is on its way...");
	$('#leftNav,#rightNav').fadeIn();
	$(document).bind('keydown',function(e){
		if(e.keyCode == 37)
			showLeft();
		if(e.keyCode == 39)
			showRight();
	});
	$('#leftNav').click(showLeft);
	$('#rightNav').click(showRight);
	var friend = $(document).data('friend');
	$('#imgMain').attr('src', 'data/images/' + friend.images[0].file);
	friend.images[0].visited = true;
	$('#imageShow').data('current', 0)
}

function animateImg(){
	$('#imgMain').stop(true,false)[0].style.width = "";
	var wid = $('#imgMain').width();
	$('#imgMain').css('width',0).animate({'width':wid+'px'},200, function(){
		$('#imgMain')[0].style.width= "";
	})
}

function showLeft(){
	var friend = $(document).data('friend');
	var prevIndex = $('#imageShow').data('current');
	var maxIndex = friend.images.length;

	var currentIndex = prevIndex - 1
	if(currentIndex == -1)
		currentIndex = maxIndex - 1;
	
	$('#imgMain')[0].onload = animateImg;
	$('#imgMain').attr('src', 'data/images/' + friend.images[currentIndex].file);
	$('#imageShow').data('current', currentIndex)
	friend.images[currentIndex].visited = true;
	if(_.filter(friend.images, {visited: true}).length == friend.images.length)
		activateInvitation();
}

function showRight(){
	var friend = $(document).data('friend');
	var prevIndex = $('#imageShow').data('current');
	var maxIndex = friend.images.length;

	var currentIndex = prevIndex + 1
	if(currentIndex == maxIndex)
		currentIndex = 0;	

	$('#imgMain')[0].onload = animateImg;
	$('#imgMain').attr('src', 'data/images/' + friend.images[currentIndex].file);
	$('#imageShow').data('current', currentIndex)
	friend.images[currentIndex].visited = true;
	if(_.filter(friend.images, {visited: true}).length == friend.images.length)
		activateInvitation();
}

function activateInvitation(){
	$('#header').html('Thou art now worthy of the ' + 
		'<button id="showInvitation" class="clickMe btn btn-lg btn-primary btn-block">INVITE</button>');
	$('#showInvitation').show().click(fncLoadInvitation);
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

function getPreloaderImages(images){
	var arrGroup = [];
	images.each(function(){
  		arrGroup.push(renderAttributes(this));
	})
	return arrGroup;
}

function loadMp3(audios){
	var arrGroup = [];
	audios.each(function(){
		var currentAudio = renderAttributes(this);
		currentAudio.audio = document.createElement('audio');
		currentAudio.audio.src = 'data/audio/' + currentAudio.url + '.mp3';
  		arrGroup.push(currentAudio);
	})
	$(document).data('audios', arrGroup);
}

function playSound(audioId, callback){
	var audios = $(document).data('audios');
	var playingAudio = _.find(audios, {id:audios.current});
	if(playingAudio != null)
		playingAudio.audio.volume = 0.4;
	var currentAudio = _.find(audios, {id:audioId});
	if(currentAudio != null){
		currentAudio.audio.currentTime = currentAudio.start ? parseInt(currentAudio.start) : 0;
		currentAudio.audio.play();
		currentAudio.audio.onended = function(){
			if(playingAudio)
				{
					playingAudio.audio.volume = 1;
			audios.current = playingAudio.id;
		}
			callback();
		};
		audios.current = audioId;
	}
}

function preloadImages(arrImages, callback, showText){
	if(showText)
		$('.preloaderText').show();
	else
		$('.preloaderText').hide();

	$('#mainBody').hide();
	$('#preloader').show();
	if(_.isEmpty(arrImages)){
		$('#mainBody').show();
		$('#preloader').hide();
		return callback();
	}

	var currentImg = arrImages.pop();
	var x = document.createElement('img');
	x.onload = x.onerror = function(){
		preloadImages(arrImages, callback, showText);
	}
	x.src = 'data/images/' + currentImg.file;
}

function fncLoadInvitation(){
	$(document).data('audios')[0].audio.pause();
	$('#album,#dragDrop').hide();
	$('#mainInvitation').show()
	videoEvent.target.playVideo();
}