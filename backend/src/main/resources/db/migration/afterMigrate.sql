-- Flyway afterMigrate callback: runs at the end of every migrate.
--
-- The f1db schema is dropped and reloaded (CASCADE) whenever the pinned F1DB
-- release changes, which also drops every view built on top of it. Recreating the
-- views here, on every start, keeps them in step with whatever F1DB is loaded.
-- Views are dropped and created (not CREATE OR REPLACE) so columns can be renamed or
-- removed later; Flyway runs this callback in one transaction, so readers never see a gap.
-- security_invoker: the views run with the caller's rights, not the owner's.

DROP VIEW IF EXISTS alterf1.season_race_results;
DROP VIEW IF EXISTS alterf1.season_champions;
DROP VIEW IF EXISTS alterf1.season_driver_standings;

-- One row per driver per points-paying session (Grand Prix or sprint) of a season.
-- This is the only input the standings engine needs; one query per season.
CREATE VIEW alterf1.season_race_results WITH (security_invoker = true) AS
SELECT
    r.year,
    r.round,
    r.id                                          AS race_id,
    r.grand_prix_id,
    r.date                                        AS race_date,
    -- 1950-60 the Indianapolis 500 counted towards the championship.
    (r.grand_prix_id = 'indianapolis')            AS indy500,
    CASE d.type WHEN 'RACE_RESULT' THEN 'RACE' ELSE 'SPRINT' END AS session,
    d.position_display_order,
    d.position_number,                            -- NULL when not classified
    d.position_text,                              -- '1', 'DNF', 'DSQ', 'DNQ', ...
    d.driver_id,
    drv.name                                      AS driver_name,
    drv.abbreviation                              AS driver_abbreviation,
    d.constructor_id,
    d.engine_manufacturer_id,
    COALESCE(d.race_shared_car, false)            AS shared_car,
    COALESCE(d.race_fastest_lap, false)           AS fastest_lap,
    d.race_laps                                   AS laps_completed,
    -- Distance actually run vs. scheduled, for half-points rules.
    CASE d.type WHEN 'RACE_RESULT' THEN r.laps ELSE r.sprint_race_laps END AS session_laps,
    CASE d.type WHEN 'RACE_RESULT' THEN r.scheduled_laps ELSE r.sprint_race_scheduled_laps END
                                                  AS session_scheduled_laps,
    -- Points actually awarded at the time (NULL = none). Used to verify the engine.
    d.race_points                                 AS actual_points
FROM f1db.race_data d
JOIN f1db.race   r   ON r.id = d.race_id
JOIN f1db.driver drv ON drv.id = d.driver_id
WHERE d.type IN ('RACE_RESULT', 'SPRINT_RACE_RESULT');

-- Real drivers' champion of each season (what actually happened).
CREATE VIEW alterf1.season_champions WITH (security_invoker = true) AS
SELECT
    s.year,
    s.driver_id,
    drv.name   AS driver_name,
    s.points
FROM f1db.season_driver_standing s
JOIN f1db.driver drv ON drv.id = s.driver_id
WHERE s.championship_won;

-- The app's read-only role (created by infra/f1db/load.sh) reads only these views.
-- The real final drivers' standings of each season (counted points, after dropped scores).
CREATE VIEW alterf1.season_driver_standings WITH (security_invoker = true) AS
SELECT
    s.year,
    s.position_display_order,
    s.position_number,
    s.position_text,
    s.driver_id,
    drv.name AS driver_name,
    s.points,
    s.championship_won
FROM f1db.season_driver_standing s
JOIN f1db.driver drv ON drv.id = s.driver_id;

GRANT SELECT ON alterf1.season_race_results, alterf1.season_champions, alterf1.season_driver_standings
    TO ${roUser};
