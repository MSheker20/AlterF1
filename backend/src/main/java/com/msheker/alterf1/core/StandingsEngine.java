package com.msheker.alterf1.core;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

import com.msheker.alterf1.core.BestResults.All;
import com.msheker.alterf1.core.BestResults.Halves;
import com.msheker.alterf1.core.BestResults.Season;
import com.msheker.alterf1.data.SessionResult;
import com.msheker.alterf1.data.SessionResult.Session;

/**
 * Computes a drivers' championship from one season of results under any scoring rules.
 * Pure and stateless: one season (~1500 rows) is recomputed in memory on every request.
 */
public final class StandingsEngine {

    private static final int SCALE = 8;
    private static final int MAX_COUNTBACK = 40;
    private static final BigDecimal HALF = new BigDecimal("0.50");
    private static final BigDecimal DOUBLE = new BigDecimal("2.00");

    /** Championship of a season under a historical system, with the given switches. */
    public List<DriverStanding> compute(List<SessionResult> season, ScoringSystem system, ScoringOptions options) {
        if (season.isEmpty()) {
            return List.of();
        }
        int year = season.getFirst().year();
        ScoringRules rules = system.rulesFor(year, raceRounds(season, options).size());
        return compute(season, rules, options, system == ScoringSystem.historicalFor(year));
    }

    /** Championship of a season under arbitrary rules (a user-defined system). */
    public List<DriverStanding> compute(List<SessionResult> season, ScoringRules rules, ScoringOptions options) {
        return compute(season, rules, options, false);
    }

    private List<DriverStanding> compute(List<SessionResult> season, ScoringRules rules, ScoringOptions options,
            boolean ownSystem) {
        if (season.isEmpty()) {
            return List.of();
        }
        int year = season.getFirst().year();
        ScoringRules realRules = ScoringSystem.historicalFor(year).historical(year);
        List<Integer> raceRounds = raceRounds(season, options);
        Map<String, Driver> drivers = new LinkedHashMap<>();

        Map<Integer, List<SessionResult>> racesByRound = season.stream()
                .filter(r -> r.session() == Session.RACE && raceRounds.contains(r.round()))
                .collect(Collectors.groupingBy(SessionResult::round, TreeMap::new, Collectors.toList()));
        racesByRound.forEach((round, rows) -> {
            RaceFacts facts = RaceFacts.derive(rows, realRules);
            scoreRace(rows, rules, facts, applicableMultiplier(facts.multiplier, options, ownSystem), options, drivers);
        });

        if (options.sprints()) {
            season.stream()
                    .filter(r -> r.session() == Session.SPRINT && r.position() != null)
                    .forEach(r -> {
                        Driver driver = driver(drivers, r);
                        driver.constructors.merge(r.constructorId(), 1, Integer::sum);
                        driver.sprint = driver.sprint.add(rules.sprintPointsFor(r.position()));
                    });
        }
        return rank(drivers.values(), rules.bestResults(), raceRounds);
    }

    /** Real-life multipliers are a user setting (PLAN.md §3): apply only what the options allow. */
    private static BigDecimal applicableMultiplier(BigDecimal detected, ScoringOptions options, boolean ownSystem) {
        boolean apply = switch (detected.compareTo(BigDecimal.ONE)) {
            case -1 -> options.halfPoints();
            case 1 -> switch (options.doublePoints()) {
                case NEVER -> false;
                case OWN_SYSTEM_ONLY -> ownSystem;
                case ALWAYS -> true;
            };
            default -> false;
        };
        return apply ? detected : BigDecimal.ONE;
    }

    // ---- race scoring -------------------------------------------------------------------

    private void scoreRace(List<SessionResult> rows, ScoringRules rules, RaceFacts facts, BigDecimal multiplier,
            ScoringOptions options, Map<String, Driver> drivers) {
        Map<Integer, Long> carsAtPosition = rows.stream()
                .filter(r -> r.classified() && !facts.ineligible(r))
                .collect(Collectors.groupingBy(SessionResult::position, Collectors.counting()));
        long fastestLapCount = rows.stream().filter(r -> r.fastestLap() && !facts.ineligible(r)).count();
        FastestLapRule fastestLap = options.fastestLap() ? rules.fastestLap() : null;

        for (SessionResult row : rows) {
            Driver driver = driver(drivers, row);
            driver.constructors.merge(row.constructorId(), 1, Integer::sum);
            if (facts.ineligible(row)) {
                driver.raceScores.merge(row.round(), BigDecimal.ZERO, BigDecimal::add);
                continue;
            }

            BigDecimal score = BigDecimal.ZERO;
            if (row.classified()) {
                driver.countFinish(row.position());
                // The system decides whether a shared car scores at all; the data, when it
                // knows, decides how the points were divided between its drivers.
                long sharing = carsAtPosition.getOrDefault(row.position(), 1L);
                BigDecimal share;
                if (sharing == 1) {
                    share = BigDecimal.ONE;
                } else if (rules.sharedDrive() == SharedDriveRule.NO_POINTS) {
                    share = BigDecimal.ZERO;
                } else {
                    share = facts.pointsShare(row);
                    if (share == null) {
                        share = BigDecimal.ONE.divide(BigDecimal.valueOf(sharing), SCALE, RoundingMode.HALF_EVEN);
                    }
                }
                score = score.add(rules.racePointsFor(facts.scoringPosition(row)).multiply(share));
            }
            if (fastestLap != null && row.fastestLap() && fastestLap.eligible(row.position())) {
                BigDecimal share = facts.fastestLapShare(row);
                if (share == null) {
                    share = fastestLap.splitWhenShared() && fastestLapCount > 1
                            ? BigDecimal.ONE.divide(BigDecimal.valueOf(fastestLapCount), SCALE, RoundingMode.HALF_EVEN)
                            : BigDecimal.ONE;
                }
                score = score.add(fastestLap.points().multiply(share));
            }
            // A driver can appear twice in one race (two cars in the 1950s): one race score.
            driver.raceScores.merge(row.round(), score.multiply(multiplier), BigDecimal::add);
        }
    }

    /**
     * Half points (race cut short) and double points (2014 Abu Dhabi) are not flagged in F1DB.
     * Detected by comparing the points really awarded with the real system's table.
     */
    static BigDecimal detectMultiplier(List<SessionResult> rows, ScoringRules realRules) {
        Map<Integer, Long> carsAtPosition = rows.stream()
                .filter(SessionResult::classified)
                .collect(Collectors.groupingBy(SessionResult::position, Collectors.counting()));
        Map<BigDecimal, Long> ratios = rows.stream()
                // Only plain results: no shared car, no fastest-lap bonus, a scoring position.
                .filter(r -> r.classified() && !r.fastestLap() && r.actualPoints() != null
                        && r.actualPoints().signum() > 0
                        && carsAtPosition.get(r.position()) == 1
                        && realRules.racePointsFor(r.position()).signum() > 0)
                .map(r -> r.actualPoints().divide(realRules.racePointsFor(r.position()), 2, RoundingMode.HALF_UP))
                .collect(Collectors.groupingBy(ratio -> ratio, Collectors.counting()));
        BigDecimal mostCommon = ratios.entrySet().stream()
                // Most common ratio; on a tie prefer "no multiplier" so the result is deterministic.
                .max(Map.Entry.<BigDecimal, Long>comparingByValue()
                        .thenComparing(e -> e.getKey().compareTo(BigDecimal.ONE) == 0)
                        .thenComparing(Map.Entry::getKey, Comparator.reverseOrder()))
                .map(Map.Entry::getKey)
                .orElse(BigDecimal.ONE);
        if (mostCommon.compareTo(HALF) == 0) {
            return HALF;
        }
        if (mostCommon.compareTo(DOUBLE) == 0) {
            return DOUBLE;
        }
        return BigDecimal.ONE;
    }

    // ---- dropped scores and ranking -----------------------------------------------------

    private List<DriverStanding> rank(Iterable<Driver> drivers, BestResults best, List<Integer> raceRounds) {
        List<Driver> sorted = new ArrayList<>();
        for (Driver driver : drivers) {
            driver.counted = counted(driver, best, raceRounds).add(driver.sprint);
            driver.gross = sum(driver.raceScores.values()).add(driver.sprint);
            sorted.add(driver);
        }
        Comparator<Driver> order = Comparator.comparing((Driver d) -> rounded(d.counted)).reversed()
                .thenComparing(Driver::countback)
                .thenComparing(d -> d.name);
        sorted.sort(order);

        List<DriverStanding> standings = new ArrayList<>(sorted.size());
        for (int i = 0; i < sorted.size(); i++) {
            Driver d = sorted.get(i);
            int position = i + 1;
            if (i > 0 && tied(d, sorted.get(i - 1))) {
                position = standings.get(i - 1).position();
            }
            standings.add(new DriverStanding(position, d.id, d.name, d.abbreviation, d.mainConstructor(),
                    rounded(d.counted), rounded(d.gross), d.finishes[1], d.finishes[1] + d.finishes[2] + d.finishes[3]));
        }
        return standings;
    }

    private static boolean tied(Driver a, Driver b) {
        return rounded(a.counted).compareTo(rounded(b.counted)) == 0 && a.countback().compareTo(b.countback()) == 0;
    }

    private static BigDecimal counted(Driver driver, BestResults best, List<Integer> raceRounds) {
        return switch (best) {
            case All() -> sum(driver.raceScores.values());
            case Season(int count) -> top(driver.raceScores.values(), count);
            case Halves(int firstHalfRaces, int firstCount, int secondCount) -> {
                List<Integer> firstHalf = raceRounds.subList(0, Math.min(firstHalfRaces, raceRounds.size()));
                List<BigDecimal> first = new ArrayList<>();
                List<BigDecimal> second = new ArrayList<>();
                driver.raceScores.forEach((round, score) -> (firstHalf.contains(round) ? first : second).add(score));
                yield top(first, firstCount).add(top(second, secondCount));
            }
        };
    }

    private static BigDecimal top(Iterable<BigDecimal> scores, int count) {
        List<BigDecimal> list = new ArrayList<>();
        scores.forEach(list::add);
        list.sort(Comparator.reverseOrder());
        return sum(list.subList(0, Math.min(count, list.size())));
    }

    private static BigDecimal sum(Iterable<BigDecimal> values) {
        BigDecimal total = BigDecimal.ZERO;
        for (BigDecimal value : values) {
            total = total.add(value);
        }
        return total;
    }

    private static BigDecimal rounded(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private static List<Integer> raceRounds(List<SessionResult> season, ScoringOptions options) {
        return season.stream()
                .filter(r -> r.session() == Session.RACE && (options.includeIndy500() || !r.indy500()))
                .map(SessionResult::round)
                .distinct()
                .sorted()
                .toList();
    }

    private static Driver driver(Map<String, Driver> drivers, SessionResult row) {
        return drivers.computeIfAbsent(row.driverId(),
                id -> new Driver(id, row.driverName(), row.driverAbbreviation()));
    }

    private static final class Driver {
        final String id;
        final String name;
        final String abbreviation;
        final Map<Integer, BigDecimal> raceScores = new TreeMap<>();
        final Map<String, Integer> constructors = new LinkedHashMap<>();
        final int[] finishes = new int[MAX_COUNTBACK + 1];
        BigDecimal sprint = BigDecimal.ZERO;
        BigDecimal counted = BigDecimal.ZERO;
        BigDecimal gross = BigDecimal.ZERO;

        Driver(String id, String name, String abbreviation) {
            this.id = id;
            this.name = name;
            this.abbreviation = abbreviation;
        }

        void countFinish(int position) {
            if (position <= MAX_COUNTBACK) {
                finishes[position]++;
            }
        }

        /** Countback key: more wins first, then more seconds, ... (smaller key = better). */
        Countback countback() {
            return new Countback(finishes);
        }

        String mainConstructor() {
            return constructors.entrySet().stream()
                    .max(Map.Entry.comparingByValue())
                    .map(Map.Entry::getKey)
                    .orElse(null);
        }
    }

    private record Countback(int[] finishes) implements Comparable<Countback> {
        @Override
        public int compareTo(Countback other) {
            for (int i = 1; i < finishes.length; i++) {
                int byPosition = Integer.compare(other.finishes[i], finishes[i]);
                if (byPosition != 0) {
                    return byPosition;
                }
            }
            return 0;
        }
    }
}
