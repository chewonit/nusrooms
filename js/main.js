function initSuggestions($textInput, roomHandler) {
	
	$.getJSON( "roomlist.json", function( data ) {
		$textInput.autocomplete({
			lookup: data,
			autoSelectFirst: true,
			triggerSelectOnValidInput: false,
			showNoSuggestionNotice: true,
			noSuggestionNotice: "No Results.",
			onSelect: function (suggestion) {
				roomHandler.publishRoom();
			}
		});
	});
}

var RoomData = function(url) {
	
	var database = (function () {
		var json = null;
		$.ajax({
			'async': false,
			'global': false,
			'url': url,
			'dataType': "json",
			'success': function (data) {
				json = data;
			}
		});
		return json;
	})();
	
	return {
		getRoomData: function(roomName) {
			return database[roomName];
		}
	};
};

var RoomHandler = function(data, list, textField) {

	var roomData = data;
	var $list = list;
	var $textInput = textField;
	
	var rooms = [];
	
	return {
		publishRoom: function() {
			var room = roomData.getRoomData( $textInput.val() );
			
			$textInput.val('');
			$textInput.focus();
			
			if ( !room ) return;
			if ( jQuery.inArray( room.name, rooms ) >= 0 ) return;
			
			$( "<div class='room-item' style='display: none;'>" + formatRoom(room) + '</div>' ).prependTo($list).slideDown();
			rooms.push( room.name );
		}
	};
};

$( document ).ready(function() {
	var $textInput = $('#textfield_roomInput');
	
	var roomData = new RoomData("nusrooms.json");
	
	var roomHandler = new RoomHandler( roomData, $('#room-list'), $textInput );
	
	initSuggestions($textInput, roomHandler);
	
    $textInput.keyup(function(e){
		if(e.keyCode == 13) {
			roomHandler.publishRoom();
		}
	});

	$textInput.focus();	
});

function formatRoom(room) {
	var startTime = 0800;
	var roomName = "<h3>" + room.name + "</h3>";
	
	var roomTable = '<div class="room-timetable table-responsive"><table class="table table-hover">';
			
	roomTable = roomTable + "<tr class='room-timetable-time-header'>";
	roomTable = roomTable + "<td></td>";
	$.each( room.schedule["Monday"], function( keyTime, valTime ) {
		if ( keyTime >= startTime ) {
			if ( keyTime.length < 4 ) {
				keyTime = "0" + keyTime;
			}
			roomTable = roomTable + "<td>" + keyTime + "</td>";
		}
	});
	roomTable = roomTable + "</tr>"
	
	$.each( room.schedule, function( keyDay, valDay ) {
		roomTable = roomTable + "<tr>";
		roomTable = roomTable + "<td>" + keyDay + "</td>";
		
		$.each( room.schedule[keyDay], function( keyTime, valTime ) {
			if ( keyTime >= startTime ) {
				var icon = "";
				var text = "";
				var color = "success";
				if ( valTime == true ) {
					icon = "glyphicon glyphicon-remove"
					text = "";
					color = "danger";
				}
				roomTable = roomTable + "<td class='" + color + "'><span class='" + icon + "'>" + text + "</span></td>";
			}
		});
		
		roomTable = roomTable + "</tr>"
	});
	
	roomTable = roomTable + "</table></div>";
	
	return ( roomName + roomTable );
}