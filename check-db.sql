-- Check filling_stations table structure
DESCRIBE filling_stations;

-- Check if station_name field exists and has data
SELECT id, station_name FROM filling_stations LIMIT 5;

-- If station_name doesn't exist, check available fields
SHOW COLUMNS FROM filling_stations;
