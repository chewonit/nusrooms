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

function initDropDown($dropdown, roomHandler, roomData) {
	
	$dropdown.append($('<option>', { 
		value: "default",
		text : "Alternatively: Select a department" 
	}));
	$.each( roomData.getDepartmentList().sort(), function (i, item) {
		$dropdown.append($('<option>', { 
			value: item,
			text : item 
		}));
	});
	
	$dropdown.change(function () {
		var dept = this.value;
		if ( dept == "default" ) return;
		
		var over = '<div id="loading-overlay">' +
            '<img id="loading" src="images/loading.gif">' +
            '</div>';
        $(over).appendTo('body');
		
		roomHandler.clearRooms();
		
		setTimeout(function(){ 
			var roomsInDept = roomData.getRoomsInDepartment(dept);
			$.each( roomsInDept, function (i, item) {
				roomHandler.publishSpecificRoom(item);
			});
			$('#loading-overlay').remove();
		}, 10);
		
	});
}

var RoomData = function(urlRooms, urlDepartments) {
	
	var databaseRooms = (function () {
		var json = null;
		$.ajax({
			'async': false,
			'global': false,
			'url': urlRooms,
			'dataType': "json",
			'success': function (data) {
				json = data;
			}
		});
		return json;
	})();
	
	var databaseDepts = (function () {
		var json = null;
		$.ajax({
			'async': false,
			'global': false,
			'url': urlDepartments,
			'dataType': "json",
			'success': function (data) {
				json = data;
			}
		});
		return json;
	})();
	
	var deptList = (function() {
		var list = [];
		$.each( databaseDepts, function( key, value ) {
			list.push(key);
		});
		return list;
	})();
	
	return {
		getRoomData: function(roomName) {
			return databaseRooms[roomName];
		},
		getDepartmentList: function() {
			return deptList;
		},
		getRoomsInDepartment: function(dept) {
			return databaseDepts[dept];
		}
	};
};

var RoomMetaData = function(url) {
	
	var metadata = (function () {
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
		getYear: function() {
			return metadata["year"];
		},
		getSem: function() {
			return metadata["sem"];
		},
		getDate: function() {
			return metadata["date"];
		}
	};
};

var RoomHandler = function(data, list, textField) {

	var roomData = data;
	var $list = list;
	var $textInput = textField;
	
	var rooms = [];
	
	function clearRoomsOnList() {
		rooms = [];
		$('.room-item').each(function(){
			$( this ).slideUp( 400, function() {
				$( this ).remove();
			});
		});
	}
	
	function prependRoom(room) {
		$( "<div class='room-item' style='display: none;'>" + formatRoom(room) + '</div>' ).prependTo($list).slideDown();
		rooms.push( room.name );
	}
	function appendRoom(room) {
		$( "<div class='room-item'>" + formatRoom(room) + '</div>' ).appendTo($list);
		rooms.push( room.name );
	}
	
	function reRenderUrl() {
		var parameters = $.encodeURL( rooms );
		if ( rooms.length == 0 ) parameters = '/';
		window.history.pushState(null,document.title, parameters);
	}
	
	return {
		publishRoom: function() {
			var room = roomData.getRoomData( $textInput.val() );
			
			$textInput.val('');
			$textInput.focus();
			
			if ( !room ) return;
			if ( jQuery.inArray( room.name, rooms ) >= 0 ) return;
			
			prependRoom(room);
			reRenderUrl();
		},
		publishSpecificRoom: function(roomName) {
			var room = roomData.getRoomData( roomName );
			
			if ( !room ) return;
			if ( jQuery.inArray( room.name, rooms ) >= 0 ) return;
			
			appendRoom(room);
			reRenderUrl();
		},
		renderUrlRooms: function() {
			var parameters = $.parseParams(window.location);
			if ( jQuery.isEmptyObject( parameters ) ) {
				return;
			}
			
			clearRoomsOnList();
			
			$.each( parameters, function( key, value ) {
				var room = roomData.getRoomData( value );
				if ( !room ) return true;
				appendRoom(room);
			});
			
			reRenderUrl();
		},
		removeRoom: function(name) {
			var index = jQuery.inArray( name, rooms );
			if ( index < 0 ) return;
			
			console.log(rooms);
			rooms.splice(index, 1);
			console.log(rooms);
			
			reRenderUrl();
		},
		clearRooms: function() {
			rooms = [];
			$('#room-list').html('');
		},
		clearRoomsAnimated: function() {
			clearRoomsOnList();
		}
	};
};

$( document ).ready(function() {
	
	var $textInput = $('#textfield_roomInput');
	var $selectInput = $('#select_roomInput');
	
	var roomData = new RoomData("nusrooms.json", "nusrooms_departments.json");
	var roomMetaData = new RoomMetaData("nusrooms_metadata.json");
	
	var roomHandler = new RoomHandler( roomData, $('#room-list'), $textInput );
	
	initSuggestions($textInput, roomHandler);
	initDropDown($selectInput, roomHandler, roomData);
	
    $textInput.keyup(function(e){
		if(e.keyCode == 13) {
			roomHandler.publishRoom();
		}
	});

	$textInput.focus();
	
	$('#nusrooms-status').html( roomMetaData.getYear().replace("-", "/") + " Semester " + roomMetaData.getSem() +
		'<br />Room schedules updated on ' + roomMetaData.getDate());
		
	roomHandler.renderUrlRooms();
	
	$(document).on('click', '.room-item-delete', function() {
		var target = $(this).parent();
		var name = target.find( '.room-item-header' ).html();
		target.slideUp( 400, function() {
			target.remove();
		});
		roomHandler.removeRoom(name);
	});
	
	$(document).on('click', '#trash-btn', function() {
		roomHandler.clearRoomsAnimated();
	});
	
	$(document).on('click', '#info-btn', function() {
		$('#info-well').slideToggle();
	});
});

function formatRoom(room) {
	var startTime = 0800;
	var roomName = "<i class='room-item-delete fa fa-times-circle'></i>&nbsp;&nbsp;<h3 class='room-item-header'>" + room.name + "</h3>";
	
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
	roomTable = roomTable + "</tr>";
	
	$.each( room.schedule, function( keyDay, valDay ) {
		roomTable = roomTable + "<tr>";
		roomTable = roomTable + "<td>" + keyDay + "</td>";
		
		$.each( room.schedule[keyDay], function( keyTime, valTime ) {
			if ( keyTime >= startTime ) {
				var icon = "";
				var text = "";
				var color = "success";
				if ( valTime == true ) {
					icon = "glyphicon glyphicon-remove";
					text = "";
					color = "danger";
				}
				roomTable = roomTable + "<td class='" + color + "'><span class='" + icon + "'>" + text + "</span></td>";
			}
		});
		
		roomTable = roomTable + "</tr>";
	});
	
	roomTable = roomTable + "</table></div>";
	
	return ( roomName + roomTable );
}


// Encode an object to an url string
// This function return the search part, begining with "?"
// Use: $.encodeURL({var: "test", len: 1}) returns ?var=test&len=1
(function ($) {
    $.encodeURL = function (object) {

        // recursive function to construct the result string
        function createString(element, nest) {
            if (element === null) return '';
            if ($.isArray(element)) {
                var count = 0,
                    url = '';
                for (var t = 0; t < element.length; t++) {
                    if (count > 0) url += '&';
                    url += nest + '[]=' + element[t];
                    count++;
                }
                return url;
            } else if (typeof element === 'object') {
                var count = 0,
                    url = '';
                for (var name in element) {
                    if (element.hasOwnProperty(name)) {
                        if (count > 0) url += '&';
                        url += createString(element[name], nest + '.' + name);
                        count++;
                    }
                }
                return url;
            } else {
                return nest + '=' + element;
            }
        }

        var url = '?',
            count = 0;

        // execute a createString on every property of object
        for (var name in object) {
            if (object.hasOwnProperty(name)) {
                if (count > 0) url += '&';
                url += createString(object[name], name);
                count++;
            }
        }

        return url;
    };
})(jQuery);

// Add an URL parser to JQuery that returns an object
// This function is meant to be used with an URL like the window.location
// Use: $.parseParams('http://mysite.com/?var=string') or $.parseParams() to parse the window.location
// Simple variable:  ?var=abc                        returns {var: "abc"}
// Simple object:    ?var.length=2&var.scope=123     returns {var: {length: "2", scope: "123"}}
// Simple array:     ?var[]=0&var[]=9                returns {var: ["0", "9"]}
// Array with index: ?var[0]=0&var[1]=9              returns {var: ["0", "9"]}
// Nested objects:   ?my.var.is.here=5               returns {my: {var: {is: {here: "5"}}}}
// All together:     ?var=a&my.var[]=b&my.cookie=no  returns {var: "a", my: {var: ["b"], cookie: "no"}}
// You just cant have an object in an array, ?var[1].test=abc DOES NOT WORK
(function ($) {
    var re = /([^&=]+)=?([^&]*)/g;
    var decode = function (str) {
        return decodeURIComponent(str.replace(/\+/g, ' '));
    };
    $.parseParams = function (query) {
        // recursive function to construct the result object
        function createElement(params, key, value) {
            key = key + '';
            // if the key is a property
            if (key.indexOf('.') !== -1) {
                // extract the first part with the name of the object
                var list = key.split('.');
                // the rest of the key
                var new_key = key.split(/\.(.+)?/)[1];
                // create the object if it doesnt exist
                if (!params[list[0]]) params[list[0]] = {};
                // if the key is not empty, create it in the object
                if (new_key !== '') {
                    createElement(params[list[0]], new_key, value);
                } else console.warn('parseParams :: empty property in key "' + key + '"');
            } else
            // if the key is an array    
            if (key.indexOf('[') !== -1) {
                // extract the array name
                var list = key.split('[');
                key = list[0];
                // extract the index of the array
                var list = list[1].split(']');
                var index = list[0]
                // if index is empty, just push the value at the end of the array
                if (index == '') {
                    if (!params) params = {};
                    if (!params[key] || !$.isArray(params[key])) params[key] = [];
                    params[key].push(value);
                } else
                // add the value at the index (must be an integer)
                {
                    if (!params) params = {};
                    if (!params[key] || !$.isArray(params[key])) params[key] = [];
                    params[key][parseInt(index)] = value;
                }
            } else
            // just normal key
            {
                if (!params) params = {};
                params[key] = value;
            }
        }
        // be sure the query is a string
        query = query + '';
        if (query === '') query = window.location + '';
        var params = {}, e;
        if (query) {
            // remove # from end of query
            if (query.indexOf('#') !== -1) {
                query = query.substr(0, query.indexOf('#'));
            }

            // remove ? at the begining of the query
            if (query.indexOf('?') !== -1) {
                query = query.substr(query.indexOf('?') + 1, query.length);
            } else return {};
            // empty parameters
            if (query == '') return {};
            // execute a createElement on every key and value
            while (e = re.exec(query)) {
                var key = decode(e[1]);
                var value = decode(e[2]);
                createElement(params, key, value);
            }
        }
        return params;
    };
})(jQuery);