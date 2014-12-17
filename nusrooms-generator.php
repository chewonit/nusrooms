<?php

class Room {
	
	public $schedule = array();
	public $departments = array();
	
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
	
	function addDept($dept) {
		if ( !in_array( $dept, $this->departments ) ) {
			array_push( $this->departments, $dept );
			sort( $this->departments );
		}
	}
	
	function getTime($timing) {
		if ( $this->schedule[$timing] ) {
			return true;
		}
		return false;
	}
}

function getAccademicYear() {
	$dateM = date("m");
	$dateY = date("Y");
	$year = "";
	if ( 8 <= $dateM && $dateM <= 12  ) {
		$year = $dateY . "-" . (intval($dateY)+1);
	} else {
		$year = (intval($dateY)-1) . "-" . $dateY;
	}
	return $year;
}

function getAccademicSem() {
	$dateM = date("m");
	$dateD = date("d");
	$semNo = 1;
	
	if ( 8 <= $dateM && $dateM <= 12 && $dateD < 16 ) {
		$semNo = 1;
	} else if ( 1 <= $dateM && $dateM <= 4 ||  $dateM = 12 ) {
		$semNo = 2;
	} else if ( 5 <= $dateM && $dateM <= 6  && $dateD < 20 ) {
		$semNo = 3;
	} else {
		$semNo = 4;
	}
	return $semNo;
}

function generateUrl() {
	return "http://api.nusmods.com/" .getAccademicYear(). "/" .getAccademicSem(). "/modules.json";
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

function writeObjectJsonToFile($path, $obj) {
	$fh = fopen($path, "w");
    if (! $fh) {
        throw new Exception("Could not open the file!");
    }
	fwrite( $fh, json_encode($obj) );
	fclose( $fh );
}

$nusrooms_metadata = array();
$rooms = array();
$roomList = array();
$departments = array();

$nusrooms_metadata["year"] = getAccademicYear();
$nusrooms_metadata["sem"] = getAccademicSem();
$nusrooms_metadata["date"] = date("d F Y");

$url = generateUrl();
$modules = json_decode( fetchJSON($url), true );

if ( $modules == null ){
	echo "Error: Could not fetch data from api.nusmods.com. <br />";
	exit("FAIL: NUS Rooms Data Generation failed.");
}

// Register each module's venue to the rooms array
foreach ($modules as $module) {
	if ( !array_key_exists( "Timetable", $module) ) {
		continue;
	}
	
	$dept = $module["Department"];
	if ( !array_key_exists ( $dept , $departments ) ) {
		$departments[$dept] = array();
	}
	
	foreach ($module["Timetable"] as &$timetable) {
		if ( empty ( $timetable["Venue"] ) ) {
			continue;
		}
		if ( !array_key_exists ( $timetable["Venue"] , $rooms ) ) {
			$rooms[ $timetable["Venue"] ] = new Room( $timetable["Venue"] );
		}
		$rooms[ $timetable["Venue"] ]->setNotVacant( $timetable["DayText"], $timetable["StartTime"], $timetable["EndTime"] );
		$rooms[ $timetable["Venue"] ]->addDept($dept);
		
		if ( !in_array( $timetable["Venue"], $departments[$dept] ) ) {
			array_push( $departments[$dept], $timetable["Venue"] );
			sort( $departments[$dept] );
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
	writeObjectJsonToFile("nusrooms.json", $rooms);
	writeObjectJsonToFile("roomlist.json", $roomList);
	writeObjectJsonToFile("nusrooms_metadata.json", $nusrooms_metadata);
	writeObjectJsonToFile("nusrooms_departments.json", $departments);
}
catch (Exception $e) {
    echo "Error (File: ".$e->getFile().", line ". $e->getLine()."): ".$e->getMessage() . " <br />";
	exit("FAIL: NUS Rooms Data Generation failed.");
}

echo "SUCCESS: NUS Rooms Data Generated";

?>
