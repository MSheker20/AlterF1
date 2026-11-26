package com.msheker.alterf1.data;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * One driver's result in one points-paying session (Grand Prix or sprint).
 * Row of {@code alterf1.season_race_results}.
 *
 * @param position     finishing position, or {@code null} when not classified
 * @param positionText raw F1DB text: "1", "DNF", "DSQ", "DNQ", ...
 * @param actualPoints points awarded at the time, or {@code null} when none
 */
public record SessionResult(
        int year,
        int round,
        int raceId,
        String grandPrixId,
        LocalDate raceDate,
        boolean indy500,
        Session session,
        int positionDisplayOrder,
        Integer position,
        String positionText,
        String driverId,
        String driverName,
        String driverAbbreviation,
        String constructorId,
        String engineManufacturerId,
        boolean sharedCar,
        boolean fastestLap,
        Integer lapsCompleted,
        Integer sessionLaps,
        Integer sessionScheduledLaps,
        BigDecimal actualPoints,
        String grandPrixCode,
        String constructorName) {

    public enum Session { RACE, SPRINT }

    public boolean classified() {
        return position != null;
    }
}
