package com.msheker.alterf1.core;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * "What if" changes to a season (PLAN.md §2.2), applied before scoring.
 *
 * @param excludedDrivers   drivers removed from every session; the cars behind move up
 * @param skippedRounds     rounds removed from the season (Grand Prix and sprint)
 * @param fastestLapRanking per round, driver ids from fastest to slowest; when the driver who
 *                          set the fastest lap is removed, the bonus passes to the next fastest
 */
public record Scenario(Set<String> excludedDrivers, Set<Integer> skippedRounds,
        Map<Integer, List<String>> fastestLapRanking) {

    public static final Scenario NONE = new Scenario(Set.of(), Set.of(), Map.of());

    public Scenario {
        excludedDrivers = Set.copyOf(excludedDrivers);
        skippedRounds = Set.copyOf(skippedRounds);
        fastestLapRanking = Map.copyOf(fastestLapRanking);
    }

    public boolean excludes(String driverId) {
        return excludedDrivers.contains(driverId);
    }

    public boolean skips(int round) {
        return skippedRounds.contains(round);
    }
}
