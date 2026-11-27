package com.msheker.alterf1.core;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;

/**
 * Constructors' championship rules for one season, as data alongside {@link ScoringRules}.
 *
 * @param bestCarOnly        true (1958-78): only each team's best-placed car scores per Grand Prix;
 *                           false (1979+): all of a team's cars score
 * @param bestResults        which race scores count towards the constructors' championship
 * @param fastestLapCounts   whether the system's fastest-lap bonus counts for constructors
 *                           (false in 1958-59; true in 2019-24 and custom systems)
 * @param racePointsOverride optional constructors-only race points table when it differed from drivers
 *                           (1961: 8-6-4-3-2-1 for constructors vs 9-6-4-3-2-1 for drivers); {@code null}
 *                           to use {@link ScoringRules#racePoints()}
 */
public record ConstructorRules(
        boolean bestCarOnly,
        BestResults bestResults,
        boolean fastestLapCounts,
        List<BigDecimal> racePointsOverride) {

    public ConstructorRules {
        Objects.requireNonNull(bestResults, "bestResults");
        if (racePointsOverride != null) {
            racePointsOverride = List.copyOf(racePointsOverride);
            if (racePointsOverride.isEmpty()) {
                throw new IllegalArgumentException("racePointsOverride must not be empty");
            }
        }
    }

    public ConstructorRules(boolean bestCarOnly, BestResults bestResults, boolean fastestLapCounts) {
        this(bestCarOnly, bestResults, fastestLapCounts, null);
    }

    public ConstructorRules withBestResults(BestResults best) {
        return new ConstructorRules(bestCarOnly, best, fastestLapCounts, racePointsOverride);
    }

    /** Effective race points table for constructors (override if present, else the base table). */
    public List<BigDecimal> effectiveRacePoints(ScoringRules base) {
        return racePointsOverride != null ? racePointsOverride : base.racePoints();
    }

    /** Effective {@link ScoringRules} used when computing constructors' race and sprint scores. */
    public ScoringRules applyTo(ScoringRules base) {
        return new ScoringRules(
                effectiveRacePoints(base),
                base.sprintPoints(),
                fastestLapCounts ? base.fastestLap() : null,
                bestResults,
                base.sharedDrive());
    }
}
