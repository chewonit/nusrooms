<?php

class Room {
	
	public $schedule = array();
	
	function Room($name) {
		$this->name = $name;
		
		$days = array();
		array_push( $days, "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" );
		
		foreach ( $days as $day ) {
			$interval = 30;
			$timing = 0800;
		
			$timingArr = array();
			while ( $timing < 2400 ) {
				$timingArr[ $timing ] = false;
				$timing += $interval;
				$timingArr[ $timing ] = false;
				$timing -= $interval;
				$timing += 100;
			}
			$this->schedule[ $day ] = $timingArr;
		}
	}
	
	function setNotVacant($day, $start, $end) {
		$start = intval($start);
		$end = intval($end);
		
		if ( $start % 100 != 0 && $start % 100 != 30 ) {
			$start = $start / 100;
		}
		if ( $end % 100 != 0 && $end % 100  != 30 ) {
			$end = $start / 100 + 30;
		}
		
		$scheduleTimesArr = &$this->schedule[$day];
		$isInInterval = false;
		foreach ($scheduleTimesArr as $key => $value) {
			
			if ( $key == $end) {
				break;
			}
			if ( $key == $start) {
				$isInInterval = true;
			}
			if ( $isInInterval == true ) {
				$scheduleTimesArr[$key] = true;
			}
		}
	}
	
	function getTime($timing) {
		if ( $this->schedule[$timing] ) {
			return true;
		}
		return false;
	}
}

function generateUrl() {
	$dateY = date("Y");
	$dateM = date("m");
	$dateD = date("d");
	$semNo = 1;
	$yearLink = "";
	
	if ( 8 <= $dateM && $dateM <= 12  ) {
		$semNo = 1;
	} else if ( 1 <= $dateM && $dateM <= 4  ) {
		$semNo = 2;
	} else if ( 1 <= $dateM && $dateM <= 4  ) {
		$semNo = 2;
	} else if ( 5 <= $dateM && $dateM <= 6  && $dateD < 20 ) {
		$semNo = 3;
	} else {
		$semNo = 4;
	}
	
	if ( 8 <= $dateM && $dateM <= 12  ) {
		$yearLink = $dateY . "-" . (intval($dateY)+1);
	} else {
		$yearLink = (intval($dateY)-1) . "-" . $dateY;
	}
	
	return "http://api.nusmods.com/" .$yearLink. "/" .$semNo. "/timetable.json";
}

function fetchJSON($url) {
	$ch = curl_init();

	curl_setopt($ch, CURLOPT_URL, $url);
	curl_setopt($ch, CURLOPT_HEADER, 0);
	curl_setopt($ch, CURLOPT_VERBOSE, 0);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	
	// grab URL and pass it to the browser
	$json = curl_exec($ch);
	
	// close cURL resource, and free up system resources
	curl_close($ch);
	
	return $json;
}

$url = generateUrl();
$modules = json_decode( fetchJSON($url), true );

$rooms = array();
$roomList = array();

// Register each module's venue to the rooms array
foreach ($modules as $module) {
	if ( !array_key_exists( "Timetable", $module) ) {
		continue;
	}
	
	foreach ($module["Timetable"] as &$timetable) {
		if ( empty ( $timetable["Venue"] ) ) {
			continue;
		}
		if ( array_key_exists ( $timetable["Venue"] , $rooms ) ) {
			$rooms[ $timetable["Venue"] ]->setNotVacant( $timetable["DayText"], $timetable["StartTime"], $timetable["EndTime"] );
		} else {
			$rooms[ $timetable["Venue"] ] = new Room( $timetable["Venue"] );
			$rooms[ $timetable["Venue"] ]->setNotVacant( $timetable["DayText"], $timetable["StartTime"], $timetable["EndTime"] );
		}
			
	}
}

// Sort Rooms by Room Names
ksort($rooms);

foreach ($rooms as $roomKey) {
	array_push( $roomList, $roomKey->name );
}

// Write JSON to file
try {
    $fh = fopen("nusrooms.json", "w");
    if (! $fh) {
        throw new Exception("Could not open the file!");
    }
	fwrite( $fh, json_encode($rooms) );
	fclose( $fh );
	
	$fh = fopen("roomlist.json", "w");
    if (! $fh) {
        throw new Exception("Could not open the file!");
    }
	fwrite( $fh, json_encode($roomList) );
	fclose( $fh );
}
catch (Exception $e) {
    echo "Error (File: ".$e->getFile().", line ". $e->getLine()."): ".$e->getMessage();
	exit("FAIL: NUS Rooms Data Generation failed.");
}

echo "SUCCESS: NUS Rooms Data Generated";

?>
