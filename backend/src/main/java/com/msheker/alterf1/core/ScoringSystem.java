package com.msheker.alterf1.core;

import static com.msheker.alterf1.core.ScoringRules.points;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

import com.msheker.alterf1.core.BestResults.Halves;
import com.msheker.alterf1.core.BestResults.Season;

/**
 * The five historical points systems. Inside its own era a system applies the exact rules of
 * that season (best-N per season, split seasons, shared drives, fastest lap, sprint tables).
 * Outside its era it applies its canonical rules, with best-N scaled to the season length
 * (PLAN.md §3, decided 2026-11-26).
 */
public enum ScoringSystem {

    S1950("1950", 1950, 1960) {
        @Override
        ScoringRules historical(int season) {
            boolean fifties = season <= 1959;
            return new ScoringRules(
                    fifties ? points(8, 6, 4, 3, 2) : points(8, 6, 4, 3, 2, 1),
                    proportionalSprint(fifties ? points(8, 6, 4, 3, 2) : points(8, 6, 4, 3, 2, 1)),
                    fifties ? FastestLapRule.FIFTIES : null,
                    new Season(season <= 1953 ? 4 : season <= 1957 || season == 1959 ? 5 : 6),
                    season <= 1957 ? SharedDriveRule.SPLIT : SharedDriveRule.NO_POINTS);
        }

        @Override
        ScoringRules canonical() {
            return historical(1950);
        }

        @Override
        int canonicalRaceCount() {
            return 7; // 1950: best 4 of 7
        }
    },

    S1961("1961", 1961, 1990) {
        @Override
        ScoringRules historical(int season) {
            List<BigDecimal> race = points(9, 6, 4, 3, 2, 1);
            return new ScoringRules(race, proportionalSprint(race), null, best1961(season), SharedDriveRule.NO_POINTS);
        }

        @Override
        ScoringRules canonical() {
            return historical(1988);
        }

        @Override
        int canonicalRaceCount() {
            return 16; // 1981-90: best 11 of 16
        }
    },

    S1991("1991", 1991, 2002) {
        @Override
        ScoringRules historical(int season) {
            List<BigDecimal> race = points(10, 6, 4, 3, 2, 1);
            return new ScoringRules(race, proportionalSprint(race), null, BestResults.ALL, SharedDriveRule.NO_POINTS);
        }
    },

    S2003("2003", 2003, 2009) {
        @Override
        ScoringRules historical(int season) {
            List<BigDecimal> race = points(10, 8, 6, 5, 4, 3, 2, 1);
            return new ScoringRules(race, proportionalSprint(race), null, BestResults.ALL, SharedDriveRule.NO_POINTS);
        }
    },

    S2010("2010", 2010, Integer.MAX_VALUE) {
        @Override
        ScoringRules historical(int season) {
            return new ScoringRules(
                    points(25, 18, 15, 12, 10, 8, 6, 4, 2, 1),
                    season == 2021 ? points(3, 2, 1) : points(8, 7, 6, 5, 4, 3, 2, 1),
                    season >= 2019 && season <= 2024 ? FastestLapRule.TOP_TEN : null,
                    BestResults.ALL,
                    SharedDriveRule.NO_POINTS);
        }

        @Override
        ScoringRules canonical() {
            // The system as introduced in 2010: no fastest-lap point; today's sprint table.
            return new ScoringRules(points(25, 18, 15, 12, 10, 8, 6, 4, 2, 1), points(8, 7, 6, 5, 4, 3, 2, 1),
                    null, BestResults.ALL, SharedDriveRule.NO_POINTS);
        }
    };

    /** Sprint winner gets 8 where the Grand Prix winner gets 25 (2022 onwards). */
    private static final BigDecimal SPRINT_RATIO = new BigDecimal("0.32");

    private final String id;
    private final int firstSeason;
    private final int lastSeason;

    ScoringSystem(String id, int firstSeason, int lastSeason) {
        this.id = id;
        this.firstSeason = firstSeason;
        this.lastSeason = lastSeason;
    }

    /** Exact rules of a season inside this system's era. */
    abstract ScoringRules historical(int season);

    /** Rules applied outside the era (before best-N scaling). */
    ScoringRules canonical() {
        return historical(firstSeason);
    }

    /** Season length the canonical best-N belongs to; only used when best-N is a {@link Season}. */
    int canonicalRaceCount() {
        return 1;
    }

    public String id() {
        return id;
    }

    public boolean covers(int season) {
        return season >= firstSeason && season <= lastSeason;
    }

    /** The rules this system applies to {@code season}, which has {@code raceCount} Grands Prix. */
    public ScoringRules rulesFor(int season, int raceCount) {
        if (covers(season)) {
            return historical(season);
        }
        ScoringRules rules = canonical();
        if (rules.bestResults() instanceof Season(int count)) {
            int scaled = Math.round((float) raceCount * count / canonicalRaceCount());
            rules = rules.withBestResults(new Season(Math.clamp(scaled, 1, Math.max(1, raceCount))));
        }
        return rules;
    }

    /** The system whose era contains {@code season}: what was really used that year. */
    public static ScoringSystem historicalFor(int season) {
        for (ScoringSystem system : values()) {
            if (system.covers(season)) {
                return system;
            }
        }
        throw new IllegalArgumentException("No championship scoring before 1950: " + season);
    }

    public static ScoringSystem byId(String id) {
        for (ScoringSystem system : values()) {
            if (system.id.equals(id)) {
                return system;
            }
        }
        throw new IllegalArgumentException("Unknown scoring system: " + id);
    }

    private static List<BigDecimal> proportionalSprint(List<BigDecimal> racePoints) {
        return racePoints.stream().map(p -> p.multiply(SPRINT_RATIO).setScale(2, RoundingMode.HALF_UP)).toList();
    }

    /** Dropped-scores rule of each 1961-90 season. */
    private static BestResults best1961(int season) {
        return switch (season) {
            case 1961, 1962, 1966 -> new Season(5);
            case 1963, 1964, 1965 -> new Season(6);
            case 1967, 1969, 1971 -> new Halves(6, 5, 4);
            case 1968, 1972 -> new Halves(6, 5, 5);
            case 1970 -> new Halves(7, 6, 5);
            case 1973, 1974 -> new Halves(8, 7, 6);
            case 1975 -> new Halves(7, 6, 6);
            case 1976, 1978 -> new Halves(8, 7, 7);
            case 1977 -> new Halves(9, 8, 7);
            case 1979 -> new Halves(7, 4, 4);
            case 1980 -> new Halves(7, 5, 5);
            default -> new Season(11); // 1981-90
        };
    }
}
