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

    /**
     * @param sprint  the weekend also had a sprint race
     * @param skipped removed by the scenario (still listed, so the UI can toggle it back)
     */
    public record RaceInfo(int round, String grandPrixId, String code, LocalDate date, boolean sprint,
            boolean skipped) {
    }

    /** Every driver who took part in the season, so a scenario can remove any of them. */
    public record Entrant(String driverId, String driverName, String driverCode, String constructorId,
            String constructorName, boolean excluded) {
    }

    public record FastestLapInfo(BigDecimal points, Integer maxPosition) {
    }

    /**
     * @param type "all", "season" (best {@code count}) or "halves"
     *             (best {@code firstCount} of the first {@code firstHalfRaces} + best {@code secondCount})
     */
    public record BestResultsInfo(String type, Integer count, Integer firstHalfRaces, Integer firstCount,
            Integer secondCount) {
    }

    /** The rules actually applied to this season (also for custom systems). */
    public record RulesInfo(List<BigDecimal> racePoints, List<BigDecimal> sprintPoints, FastestLapInfo fastestLap,
            BestResultsInfo bestResults) {
    }

    public record CustomInfo(List<BigDecimal> racePoints, boolean fastestLap, String sprint, Integer bestResults) {
    }

    /** The scenario as understood by the server (echo of the query). */
    public record ScenarioInfo(List<String> excludedDrivers, List<Integer> skippedRounds, boolean sprints,
            boolean fastestLap, String preset, CustomInfo custom) {
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
            ScenarioInfo scenario,
            RulesInfo rules,
            List<RaceInfo> races,
            List<Entrant> entrants,
            Champion champion,
            Champion realChampion,
            boolean championChanged,
            List<StandingLine> standings) {
    }
}
