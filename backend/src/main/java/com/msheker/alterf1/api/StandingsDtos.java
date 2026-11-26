package com.msheker.alterf1.api;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** JSON shapes of the standings API (contract shared with the frontend's src/api/types.ts). */
public final class StandingsDtos {

    private StandingsDtos() {
    }

    public record DriverRef(String driverId, String driverName) {
    }

    public record SeasonSummary(int year, DriverRef champion) {
    }

    public record SystemInfo(String id, int firstSeason, Integer lastSeason, List<BigDecimal> racePoints) {
    }

    public record RaceInfo(int round, String grandPrixId, String code, LocalDate date) {
    }

    public record Champion(String driverId, String driverName, BigDecimal points) {
    }

    /**
     * @param realPosition   the driver's real championship position, {@code null} if not classified
     * @param positionChange realPosition − position (positive = gained places), {@code null} if unknown
     * @param results        one entry per race of {@link StandingsResponse#races()}: "1", "DNF", ... or ""
     */
    public record StandingLine(
            int position,
            Integer realPosition,
            Integer positionChange,
            String driverId,
            String driverName,
            String driverCode,
            String constructorId,
            String constructorName,
            BigDecimal points,
            BigDecimal realPoints,
            int wins,
            int podiums,
            List<String> results) {
    }

    public record StandingsResponse(
            int season,
            String system,
            String realSystem,
            String preset,
            List<RaceInfo> races,
            Champion champion,
            Champion realChampion,
            boolean championChanged,
            List<StandingLine> standings) {
    }
}
