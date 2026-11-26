package com.msheker.alterf1.core;

import java.math.BigDecimal;
import java.util.List;

import com.msheker.alterf1.core.BestResults.Season;

/**
 * A user-defined points system (PLAN.md §2.2, Dilim 3 decisions): a points table plus three
 * switches. It applies as given to any season (no era rules, no best-N scaling).
 *
 * @param racePoints  points for P1, P2, ...
 * @param fastestLap  +1 for a top-10 finisher who sets the fastest lap
 * @param sprint      sprint table
 * @param bestResults count only the best N race scores, or {@code null} for all
 */
public record CustomSystem(List<BigDecimal> racePoints, boolean fastestLap, Sprint sprint, Integer bestResults) {

    public enum Sprint {
        NONE("none"), CLASSIC("321"), MODERN("8");

        private final String id;

        Sprint(String id) {
            this.id = id;
        }

        public String id() {
            return id;
        }

        public static Sprint byId(String id) {
            for (Sprint s : values()) {
                if (s.id.equals(id)) {
                    return s;
                }
            }
            throw new IllegalArgumentException("Unknown sprint table: " + id);
        }

        List<BigDecimal> points() {
            return switch (this) {
                case NONE -> List.of();
                case CLASSIC -> ScoringRules.points(3, 2, 1);
                case MODERN -> ScoringRules.points(8, 7, 6, 5, 4, 3, 2, 1);
            };
        }
    }

    public CustomSystem {
        racePoints = List.copyOf(racePoints);
    }

    public ScoringRules rules() {
        return new ScoringRules(
                racePoints,
                sprint.points(),
                fastestLap ? FastestLapRule.TOP_TEN : null,
                bestResults == null ? BestResults.ALL : new Season(bestResults),
                // Only matters in the 1950s: shared cars keep the split that really happened.
                SharedDriveRule.SPLIT);
    }
}
