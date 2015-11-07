$(document).ready(function(){
	loadXmlAndContinue();
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

function loadDragDrop(name){
	var friends = $(document).data('friends'),
		groups = $(document).data('groups'),
		friend = _.find(friends, function(curr){
			return curr.name.toLowerCase() == name.toLowerCase()}),
		group = _.find(groups, {id: friend.group});

	console.log(groups)
	console.log(friend)
	console.log(group)

	return false;
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
