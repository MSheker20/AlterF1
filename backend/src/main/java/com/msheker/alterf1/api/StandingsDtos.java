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

    // ---- compare: every system side by side ----

    public record CompareSystem(String id, Champion champion, boolean championChanged) {
    }

    public record CompareCell(int position, BigDecimal points) {
    }

    /** @param cells system id → this driver's position and points under that system */
    public record CompareDriver(String driverId, String driverName, String driverCode, String constructorId,
            String constructorName, Integer realPosition, java.util.Map<String, CompareCell> cells) {
    }

    public record CompareResponse(int season, String realSystem, List<CompareSystem> systems,
            List<CompareDriver> drivers) {
    }

    // ---- progression: totals race by race ----

    public record ProgressionRace(int round, String code, boolean sprint) {
    }

    /** @param points championship total (after dropped scores) after each race of {@code races} */
    public record ProgressionDriver(String driverId, String driverName, String driverCode, String constructorId,
            int position, List<BigDecimal> points) {
    }

    public record ClinchInfo(int round, String code, String driverId) {
    }

    /** @param clinch the race after which the title could no longer be lost; null if only at the last race */
    public record ProgressionResponse(int season, String system, List<ProgressionRace> races,
            List<ProgressionDriver> drivers, ClinchInfo clinch) {
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
            /** Why points may look unusual this season: "half-points", "shared-points", ... (PLAN.md §7). */
            List<String> notes,
            List<StandingLine> standings) {
    }

    // ---- highlights: seasons whose champion changes under another system (home page) ----

    /**
     * @param realChampionPosition where the real champion finishes under {@code system}
     * @param realChampionPoints   the real champion's points under {@code system}
     */
    public record HighlightAlternative(String system, Champion champion, String championConstructorId,
            int realChampionPosition, BigDecimal realChampionPoints) {
    }

    public record Highlight(int season, String realSystem, Champion realChampion,
            String realChampionConstructorId, List<HighlightAlternative> alternatives) {
    }
}
