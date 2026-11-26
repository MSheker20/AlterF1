package com.msheker.alterf1.data;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

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
                       actual_points
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
                        rs.getBigDecimal("actual_points")))
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

    /** Every season that has results, oldest first. */
    public List<Integer> findSeasons() {
        return jdbc.sql("SELECT DISTINCT year FROM alterf1.season_race_results ORDER BY year")
                .query(Integer.class)
                .list();
    }
}
