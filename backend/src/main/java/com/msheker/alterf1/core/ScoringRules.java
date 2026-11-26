package com.msheker.alterf1.core;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;

/**
 * Complete scoring rules for one season, as data. Historical systems and user-defined
 * systems use the same record.
 *
 * @param racePoints   points for P1, P2, ... in a Grand Prix
 * @param sprintPoints points for P1, P2, ... in a sprint (empty = sprints score nothing)
 * @param fastestLap   fastest-lap bonus, or {@code null} for none
 * @param bestResults  which race scores count
 * @param sharedDrive  how shared drives score
 */
public record ScoringRules(
        List<BigDecimal> racePoints,
        List<BigDecimal> sprintPoints,
        FastestLapRule fastestLap,
        BestResults bestResults,
        SharedDriveRule sharedDrive) {

    public ScoringRules {
        racePoints = List.copyOf(racePoints);
        sprintPoints = List.copyOf(sprintPoints);
        Objects.requireNonNull(bestResults, "bestResults");
        Objects.requireNonNull(sharedDrive, "sharedDrive");
        if (racePoints.isEmpty()) {
            throw new IllegalArgumentException("racePoints must not be empty");
        }
    }

    public static List<BigDecimal> points(int... values) {
        return java.util.Arrays.stream(values).mapToObj(BigDecimal::valueOf).toList();
    }

    public BigDecimal racePointsFor(int position) {
        return position >= 1 && position <= racePoints.size() ? racePoints.get(position - 1) : BigDecimal.ZERO;
    }

    public BigDecimal sprintPointsFor(int position) {
        return position >= 1 && position <= sprintPoints.size() ? sprintPoints.get(position - 1) : BigDecimal.ZERO;
    }

    public ScoringRules withBestResults(BestResults best) {
        return new ScoringRules(racePoints, sprintPoints, fastestLap, best, sharedDrive);
    }

    public ScoringRules withSprintPoints(List<BigDecimal> sprint) {
        return new ScoringRules(racePoints, sprint, fastestLap, bestResults, sharedDrive);
    }
}
