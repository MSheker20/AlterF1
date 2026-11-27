package com.msheker.alterf1.data;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Read-only access to season results. One query per season, everything else happens in memory. */
@Repository
public class SeasonResultsRepository {

    private final JdbcClient jdbc;

    public SeasonResultsRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** All Grand Prix and sprint results of a season, in round order. Empty for an unknown year. */
    public List<SessionResult> findBySeason(int year) {
        return jdbc.sql("""
                SELECT year, round, race_id, grand_prix_id, race_date, indy500, session,
                       position_display_order, position_number, position_text,
                       driver_id, driver_name, driver_abbreviation, constructor_id, engine_manufacturer_id,
                       shared_car, fastest_lap, laps_completed, session_laps, session_scheduled_laps,
                       actual_points, grand_prix_code, constructor_name, engine_manufacturer_name
                FROM alterf1.season_race_results
                WHERE year = :year
                ORDER BY round,
                         CASE session WHEN 'SPRINT' THEN 0 ELSE 1 END, -- sprint runs before the Grand Prix
                         position_display_order
                """)
                .param("year", year)
                .query((rs, n) -> new SessionResult(
                        rs.getInt("year"),
                        rs.getInt("round"),
                        rs.getInt("race_id"),
                        rs.getString("grand_prix_id"),
                        rs.getObject("race_date", LocalDate.class),
                        rs.getBoolean("indy500"),
                        SessionResult.Session.valueOf(rs.getString("session")),
                        rs.getInt("position_display_order"),
                        rs.getObject("position_number", Integer.class),
                        rs.getString("position_text"),
                        rs.getString("driver_id"),
                        rs.getString("driver_name"),
                        rs.getString("driver_abbreviation"),
                        rs.getString("constructor_id"),
                        rs.getString("engine_manufacturer_id"),
                        rs.getBoolean("shared_car"),
                        rs.getBoolean("fastest_lap"),
                        rs.getObject("laps_completed", Integer.class),
                        rs.getObject("session_laps", Integer.class),
                        rs.getObject("session_scheduled_laps", Integer.class),
                        rs.getBigDecimal("actual_points"),
                        rs.getString("grand_prix_code"),
                        rs.getString("constructor_name"),
                        rs.getString("engine_manufacturer_name")))
                .list();
    }

    /** The real champion of a season, if the season has one yet. */
    public Optional<SeasonChampion> findChampion(int year) {
        return jdbc.sql("""
                SELECT year, driver_id, driver_name, points
                FROM alterf1.season_champions
                WHERE year = :year
                """)
                .param("year", year)
                .query(SeasonChampion.class)
                .optional();
    }

    /** The real final drivers' standings of a season, in championship order. */
    public List<RealStanding> findRealStandings(int year) {
        return jdbc.sql("""
                SELECT position_number AS position, position_text, driver_id, driver_name, points
                FROM alterf1.season_driver_standings
                WHERE year = :year
                ORDER BY position_display_order
                """)
                .param("year", year)
                .query(RealStanding.class)
                .list();
    }

    /** The real final constructors' standings of a season (1958+), in championship order. Empty before 1958. */
    public List<RealConstructorStanding> findRealConstructorStandings(int year) {
        return jdbc.sql("""
                SELECT position_number AS position, position_text,
                       constructor_id, constructor_name,
                       engine_manufacturer_id, engine_manufacturer_name,
                       points, championship_won
                FROM alterf1.season_constructor_standings
                WHERE year = :year
                ORDER BY position_display_order
                """)
                .param("year", year)
                .query(RealConstructorStanding.class)
                .list();
    }

    /** The real champion of every season that has one. */
    public List<SeasonChampion> findChampions() {
        return jdbc.sql("SELECT year, driver_id, driver_name, points FROM alterf1.season_champions ORDER BY year")
                .query(SeasonChampion.class)
                .list();
    }

    /** Fastest-lap ranking per round of a season: round → driver ids, fastest first. */
    public Map<Integer, List<String>> findFastestLapRanking(int year) {
        Map<Integer, List<String>> ranking = new TreeMap<>();
        jdbc.sql("""
                SELECT round, driver_id FROM alterf1.season_fastest_laps
                WHERE year = :year ORDER BY round, rank, driver_id
                """)
                .param("year", year)
                .query((rs, n) -> Map.entry(rs.getInt("round"), rs.getString("driver_id")))
                .list()
                .forEach(e -> ranking.computeIfAbsent(e.getKey(), r -> new ArrayList<>()).add(e.getValue()));
        return ranking;
    }

    /** Every season that has results, oldest first. */
    public List<Integer> findSeasons() {
        return jdbc.sql("SELECT year FROM alterf1.seasons ORDER BY year")
                .query(Integer.class)
                .list();
    }
}
