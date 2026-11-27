package com.msheker.alterf1.core;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
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
        return compute(season, system, options, Scenario.NONE);
    }

    /** Championship of a season under a historical system, after a "what if" scenario. */
    public List<DriverStanding> compute(List<SessionResult> season, ScoringSystem system, ScoringOptions options,
            Scenario scenario) {
        if (season.isEmpty()) {
            return List.of();
        }
        int year = season.getFirst().year();
        return compute(season, rulesFor(season, system, options, scenario), options,
                system == ScoringSystem.historicalFor(year), scenario);
    }

    /** The rules a historical system applies to this season after the scenario (best-N scales with it). */
    public ScoringRules rulesFor(List<SessionResult> season, ScoringSystem system, ScoringOptions options,
            Scenario scenario) {
        int year = season.getFirst().year();
        int raceCount = (int) raceRounds(season, options).stream().filter(r -> !scenario.skips(r)).count();
        return system.rulesFor(year, raceCount);
    }

    /** Championship of a season under arbitrary rules (a user-defined system). */
    public List<DriverStanding> compute(List<SessionResult> season, ScoringRules rules, ScoringOptions options) {
        return compute(season, rules, options, false, Scenario.NONE);
    }

    /** Championship of a season under arbitrary rules, after a "what if" scenario. */
    public List<DriverStanding> compute(List<SessionResult> season, ScoringRules rules, ScoringOptions options,
            Scenario scenario) {
        return compute(season, rules, options, false, scenario);
    }

    private List<DriverStanding> compute(List<SessionResult> season, ScoringRules rules, ScoringOptions options,
            boolean ownSystem, Scenario scenario) {
        if (season.isEmpty()) {
            return List.of();
        }
        Scored scored = score(season, rules, options, ownSystem, scenario);
        return rank(scored.drivers().values(), rules.bestResults(), scored.allRaceRounds());
    }

    /** Everything scored for a season, before ranking: per-driver race and sprint scores per round. */
    private record Scored(Map<String, Driver> drivers, List<Integer> allRaceRounds, List<Integer> raceRounds,
            Map<Integer, BigDecimal> multipliers, Set<Integer> sprintRounds, Set<SeasonNote> notes) {
    }

    private Scored score(List<SessionResult> season, ScoringRules rules, ScoringOptions options,
            boolean ownSystem, Scenario scenario) {
        int year = season.getFirst().year();
        ScoringRules realRules = ScoringSystem.historicalFor(year).historical(year);
        // Split seasons (1967-80) keep their calendar halves even when a race is removed.
        List<Integer> allRaceRounds = raceRounds(season, options);
        List<Integer> raceRounds = allRaceRounds.stream().filter(r -> !scenario.skips(r)).toList();
        Map<String, Driver> drivers = new LinkedHashMap<>();

        Map<Integer, List<SessionResult>> racesByRound = season.stream()
                .filter(r -> r.session() == Session.RACE && raceRounds.contains(r.round()))
                .collect(Collectors.groupingBy(SessionResult::round, TreeMap::new, Collectors.toList()));
        Map<Integer, BigDecimal> multipliers = new HashMap<>();
        Set<SeasonNote> notes = EnumSet.noneOf(SeasonNote.class);
        racesByRound.forEach((round, rows) -> {
            // What really happened is read from the full, unchanged race; the scenario comes after.
            RaceFacts facts = RaceFacts.derive(rows, realRules);
            BigDecimal multiplier = applicableMultiplier(facts.multiplier, options, ownSystem);
            multipliers.put(round, multiplier);
            if (multiplier.compareTo(BigDecimal.ONE) < 0) {
                notes.add(SeasonNote.HALF_POINTS);
            } else if (multiplier.compareTo(BigDecimal.ONE) > 0) {
                notes.add(SeasonNote.DOUBLE_POINTS);
            }
            scoreRace(rows, rules, facts, multiplier, options, drivers, scenario, notes);
        });

        Set<Integer> sprintRounds = new java.util.HashSet<>();
        if (options.sprints()) {
            season.stream()
                    .filter(r -> r.session() == Session.SPRINT && raceRounds.contains(r.round()))
                    .collect(Collectors.groupingBy(SessionResult::round, TreeMap::new, Collectors.toList()))
                    .forEach((round, rows) -> {
                        sprintRounds.add(round);
                        Map<Integer, Integer> positions = renumber(rows, scenario);
                        for (SessionResult r : rows) {
                            Integer position = positions.get(r.positionDisplayOrder());
                            if (scenario.excludes(r.driverId()) || position == null) {
                                continue;
                            }
                            Driver driver = driver(drivers, r);
                            driver.constructors.merge(r.constructorId(), 1, Integer::sum);
                            driver.sprintScores.merge(round, rules.sprintPointsFor(position), BigDecimal::add);
                        }
                    });
        }
        return new Scored(drivers, allRaceRounds, raceRounds, multipliers, sprintRounds, notes);
    }

    // ---- season notes -------------------------------------------------------------------------

    /** What explains unusual points in this season under a historical system (PLAN.md §7). */
    public Set<SeasonNote> notes(List<SessionResult> season, ScoringSystem system, ScoringOptions options,
            Scenario scenario) {
        if (season.isEmpty()) {
            return Set.of();
        }
        int year = season.getFirst().year();
        ScoringRules rules = rulesFor(season, system, options, scenario);
        Scored scored = score(season, rules, options, system == ScoringSystem.historicalFor(year), scenario);
        Set<SeasonNote> notes = EnumSet.noneOf(SeasonNote.class);
        notes.addAll(scored.notes());
        // Only the 2010 system has real sprint tables; the others use the 3-2-1 assumption.
        if (system != ScoringSystem.S2010 && !scored.sprintRounds().isEmpty() && rules.sprintPointsFor(1).signum() > 0) {
            notes.add(SeasonNote.SPRINT_ASSUMED);
        }
        if (!system.covers(year) && rules.bestResults() instanceof Season) {
            notes.add(SeasonNote.BEST_SCALED);
        }
        return Set.copyOf(notes);
    }

    /** What explains unusual points in this season under arbitrary (user-defined) rules. */
    public Set<SeasonNote> notes(List<SessionResult> season, ScoringRules rules, ScoringOptions options,
            Scenario scenario) {
        if (season.isEmpty()) {
            return Set.of();
        }
        return Set.copyOf(score(season, rules, options, false, scenario).notes());
    }

    // ---- progression and clinch --------------------------------------------------------------

    /** Championship totals after each counting race, and the race where the title was decided. */
    public record Progression(List<Integer> rounds, Set<Integer> scoringSprintRounds,
            Map<String, List<BigDecimal>> totals,
            List<DriverStanding> standings, Clinch clinch) {
    }

    /** The title could no longer be lost after {@code round}. */
    public record Clinch(int round, String driverId) {
    }

    /** Race-by-race championship totals of a season under a historical system and scenario. */
    public Progression progression(List<SessionResult> season, ScoringSystem system, ScoringOptions options,
            Scenario scenario) {
        if (season.isEmpty()) {
            return new Progression(List.of(), Set.of(), Map.of(), List.of(), null);
        }
        int year = season.getFirst().year();
        return progression(season, rulesFor(season, system, options, scenario), options,
                system == ScoringSystem.historicalFor(year), scenario);
    }

    /** Race-by-race championship totals of a season under arbitrary rules and scenario. */
    public Progression progression(List<SessionResult> season, ScoringRules rules, ScoringOptions options,
            Scenario scenario) {
        if (season.isEmpty()) {
            return new Progression(List.of(), Set.of(), Map.of(), List.of(), null);
        }
        return progression(season, rules, options, false, scenario);
    }

    private Progression progression(List<SessionResult> season, ScoringRules rules, ScoringOptions options,
            boolean ownSystem, Scenario scenario) {
        Scored scored = score(season, rules, options, ownSystem, scenario);
        List<DriverStanding> standings = rank(scored.drivers().values(), rules.bestResults(), scored.allRaceRounds());
        List<Integer> rounds = scored.raceRounds();

        // Totals as the championship stood after each race: dropped scores apply to the races so far.
        Map<String, List<BigDecimal>> totals = new LinkedHashMap<>();
        for (DriverStanding s : standings) {
            Driver d = scored.drivers().get(s.driverId());
            List<BigDecimal> line = new ArrayList<>(rounds.size());
            for (int round : rounds) {
                line.add(rounded(totalUpTo(d, round, rules.bestResults(), scored.allRaceRounds())));
            }
            totals.put(s.driverId(), line);
        }
        Set<Integer> scoringSprints = rules.sprintPointsFor(1).signum() > 0 ? Set.copyOf(scored.sprintRounds())
                : Set.of();
        return new Progression(rounds, scoringSprints, totals, standings, clinch(scored, rules, options));
    }

    /**
     * The first race after which no rival could catch the leader, even by winning every remaining
     * race with every bonus (sprint and fastest lap, with real-life multipliers), dropped scores
     * included. Never the last race: a title settled there was not decided early.
     */
    private Clinch clinch(Scored scored, ScoringRules rules, ScoringOptions options) {
        if (scored.drivers().size() < 2) {
            return null; // nobody left to beat: nothing was decided on track
        }
        List<Integer> rounds = scored.raceRounds();
        BigDecimal bestRace = rules.racePointsFor(1).add(options.fastestLap() && rules.fastestLap() != null
                ? rules.fastestLap().points() : BigDecimal.ZERO);
        BigDecimal bestSprint = rules.sprintPointsFor(1);
        for (int i = 0; i < rounds.size() - 1; i++) {
            int round = rounds.get(i);
            List<Integer> remaining = rounds.subList(i + 1, rounds.size());
            Driver leader = null;
            BigDecimal leaderTotal = BigDecimal.ZERO;
            for (Driver d : scored.drivers().values()) {
                BigDecimal total = totalUpTo(d, round, rules.bestResults(), scored.allRaceRounds());
                int byPoints = leader == null ? 1 : rounded(total).compareTo(rounded(leaderTotal));
                if (byPoints > 0 || (byPoints == 0
                        && new Countback(d.finishesUpTo(round)).compareTo(new Countback(leader.finishesUpTo(round))) < 0)) {
                    leader = d;
                    leaderTotal = total;
                }
            }
            if (leader == null || leaderTotal.signum() == 0) {
                continue;
            }
            boolean decided = true;
            for (Driver rival : scored.drivers().values()) {
                if (rival == leader) {
                    continue;
                }
                Map<Integer, BigDecimal> hypothetical = new TreeMap<>(rival.raceScores);
                hypothetical.keySet().removeIf(r -> r > round);
                BigDecimal sprints = sumUpTo(rival.sprintScores, round);
                for (int r : remaining) {
                    // Half points in a race still to come were not known in advance; double points were
                    // (announced for 2014), so the best case never assumes less than full points.
                    hypothetical.put(r, bestRace.multiply(
                            scored.multipliers().getOrDefault(r, BigDecimal.ONE).max(BigDecimal.ONE)));
                    if (scored.sprintRounds().contains(r)) {
                        sprints = sprints.add(bestSprint);
                    }
                }
                BigDecimal rivalBest = counted(hypothetical, rules.bestResults(), scored.allRaceRounds()).add(sprints);
                int comparison = rounded(rivalBest).compareTo(rounded(leaderTotal));
                if (comparison > 0) {
                    decided = false;
                    break;
                }
                if (comparison == 0) {
                    // A tie is broken on countback. The rival's best case wins every remaining race;
                    // the leader can only add finishes, so his countback now is his worst case.
                    int[] rivalFinishes = rival.finishesUpTo(round);
                    rivalFinishes[1] += remaining.size();
                    if (new Countback(leader.finishesUpTo(round)).compareTo(new Countback(rivalFinishes)) >= 0) {
                        decided = false;
                        break;
                    }
                }
            }
            if (decided) {
                return new Clinch(round, leader.id);
            }
        }
        return null;
    }

    private static BigDecimal totalUpTo(Driver d, int round, BestResults best, List<Integer> allRaceRounds) {
        Map<Integer, BigDecimal> soFar = new TreeMap<>(d.raceScores);
        soFar.keySet().removeIf(r -> r > round);
        return counted(soFar, best, allRaceRounds).add(sumUpTo(d.sprintScores, round));
    }

    private static BigDecimal sumUpTo(Map<Integer, BigDecimal> scores, int round) {
        BigDecimal total = BigDecimal.ZERO;
        for (Map.Entry<Integer, BigDecimal> e : scores.entrySet()) {
            if (e.getKey() <= round) {
                total = total.add(e.getValue());
            }
        }
        return total;
    }

    /**
     * Finishing positions after removing excluded drivers: everyone behind a vacated position
     * moves up. A shared car whose other driver remains keeps its position.
     * Returns positionDisplayOrder → new position, for the remaining classified rows.
     * Public so the API shows the same renumbered results the points were computed from.
     */
    public static Map<Integer, Integer> renumber(List<SessionResult> rows, Scenario scenario) {
        Map<Integer, List<SessionResult>> byPosition = rows.stream()
                .filter(SessionResult::classified)
                .collect(Collectors.groupingBy(SessionResult::position, TreeMap::new, Collectors.toList()));
        Map<Integer, Integer> positions = new HashMap<>();
        int vacated = 0;
        for (Map.Entry<Integer, List<SessionResult>> e : byPosition.entrySet()) {
            List<SessionResult> remaining = e.getValue().stream().filter(r -> !scenario.excludes(r.driverId())).toList();
            if (remaining.isEmpty()) {
                vacated++;
                continue;
            }
            for (SessionResult r : remaining) {
                positions.put(r.positionDisplayOrder(), e.getKey() - vacated);
            }
        }
        return positions;
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

    private void scoreRace(List<SessionResult> allRows, ScoringRules rules, RaceFacts facts, BigDecimal multiplier,
            ScoringOptions options, Map<String, Driver> drivers, Scenario scenario, Set<SeasonNote> notes) {
        List<SessionResult> rows = allRows.stream().filter(r -> !scenario.excludes(r.driverId())).toList();
        Map<Integer, Integer> positions = renumber(allRows, scenario);
        Map<Integer, Integer> scoringPositions = scoringPositions(rows, positions, facts);
        Set<Integer> transferredFastestLap = transferFastestLap(allRows, rows, scenario, facts);
        // Real-life splits only hold while everyone who shared still takes part: once a driver of a
        // shared car or of a shared fastest lap is removed, the rest split by the rule instead.
        Set<Integer> brokenSharedPositions = allRows.stream()
                .filter(r -> r.classified() && scenario.excludes(r.driverId()))
                .map(SessionResult::position)
                .collect(Collectors.toSet());
        boolean fastestLapShareBroken = allRows.stream()
                .anyMatch(r -> r.fastestLap() && scenario.excludes(r.driverId()));

        Map<Integer, Long> carsAtPosition = rows.stream()
                .filter(r -> r.classified() && !facts.ineligible(r))
                .collect(Collectors.groupingBy(r -> positions.get(r.positionDisplayOrder()), Collectors.counting()));
        long fastestLapCount = rows.stream()
                .filter(r -> (r.fastestLap() || transferredFastestLap.contains(r.positionDisplayOrder()))
                        && !facts.ineligible(r))
                .count();
        FastestLapRule fastestLap = options.fastestLap() ? rules.fastestLap() : null;

        for (SessionResult row : rows) {
            Driver driver = driver(drivers, row);
            driver.constructors.merge(row.constructorId(), 1, Integer::sum);
            if (facts.ineligible(row)) {
                notes.add(SeasonNote.INELIGIBLE);
                driver.raceScores.merge(row.round(), BigDecimal.ZERO, BigDecimal::add);
                continue;
            }

            Integer position = positions.get(row.positionDisplayOrder());
            BigDecimal score = BigDecimal.ZERO;
            if (position != null) {
                driver.countFinish(row.round(), position);
                // The system decides whether a shared car scores at all; the data, when it
                // knows, decides how the points were divided between its drivers.
                long sharing = carsAtPosition.getOrDefault(position, 1L);
                BigDecimal share;
                if (sharing == 1) {
                    share = BigDecimal.ONE;
                } else if (rules.sharedDrive() == SharedDriveRule.NO_POINTS) {
                    share = BigDecimal.ZERO;
                } else {
                    share = brokenSharedPositions.contains(row.position()) ? null : facts.pointsShare(row);
                    if (share == null) {
                        share = BigDecimal.ONE.divide(BigDecimal.valueOf(sharing), SCALE, RoundingMode.HALF_EVEN);
                    }
                }
                BigDecimal positionPoints = rules.racePointsFor(scoringPositions.get(row.positionDisplayOrder()));
                if (share.compareTo(BigDecimal.ONE) < 0 && share.signum() > 0 && positionPoints.signum() > 0) {
                    notes.add(SeasonNote.SHARED_POINTS);
                }
                score = score.add(positionPoints.multiply(share));
            }
            boolean transferred = transferredFastestLap.contains(row.positionDisplayOrder());
            if (fastestLap != null && (row.fastestLap() || transferred) && fastestLap.eligible(position)) {
                // A bonus passed on by a scenario has no real-life split to follow.
                BigDecimal share = transferred || fastestLapShareBroken ? null : facts.fastestLapShare(row);
                if (share == null) {
                    share = fastestLap.splitWhenShared() && fastestLapCount > 1
                            ? BigDecimal.ONE.divide(BigDecimal.valueOf(fastestLapCount), SCALE, RoundingMode.HALF_EVEN)
                            : BigDecimal.ONE;
                }
                if (share.compareTo(BigDecimal.ONE) < 0 && share.signum() > 0) {
                    notes.add(SeasonNote.SHARED_POINTS);
                }
                score = score.add(fastestLap.points().multiply(share));
            }
            // A driver can appear twice in one race (two cars in the 1950s): one race score.
            driver.raceScores.merge(row.round(), score.multiply(multiplier), BigDecimal::add);
        }
    }

    /**
     * The position each remaining car scores for. Normally its (renumbered) finishing position;
     * in races where ineligible cars' points passed to the cars behind (1967/69), its rank
     * among the eligible cars.
     */
    private static Map<Integer, Integer> scoringPositions(List<SessionResult> rows, Map<Integer, Integer> positions,
            RaceFacts facts) {
        if (!facts.pointsPassedDown) {
            return positions;
        }
        Map<Integer, Integer> ranks = new HashMap<>();
        int rank = 1;
        List<SessionResult> classified = rows.stream()
                .filter(r -> positions.containsKey(r.positionDisplayOrder()))
                .sorted(Comparator.comparing((SessionResult r) -> positions.get(r.positionDisplayOrder()))
                        .thenComparing(SessionResult::positionDisplayOrder))
                .toList();
        for (SessionResult r : classified) {
            if (!facts.ineligible(r)) {
                ranks.put(r.positionDisplayOrder(), rank++);
            }
        }
        return ranks;
    }

    /**
     * When every driver who set the fastest lap was removed, the bonus passes to the next fastest
     * remaining driver (PLAN.md §2.2). Returns the positionDisplayOrder of the row that receives it.
     */
    private static Set<Integer> transferFastestLap(List<SessionResult> allRows, List<SessionResult> rows,
            Scenario scenario, RaceFacts facts) {
        boolean removedHolder = allRows.stream().anyMatch(r -> r.fastestLap() && scenario.excludes(r.driverId()));
        boolean remainingHolder = rows.stream().anyMatch(r -> r.fastestLap() && !facts.ineligible(r));
        if (!removedHolder || remainingHolder || rows.isEmpty()) {
            return Set.of();
        }
        // The next fastest driver who is still in the race and may score.
        List<String> ranking = scenario.fastestLapRanking().getOrDefault(rows.getFirst().round(), List.of());
        for (String next : ranking) {
            if (scenario.excludes(next)) {
                continue;
            }
            var candidate = rows.stream()
                    .filter(r -> r.driverId().equals(next) && !facts.ineligible(r))
                    .min(Comparator.comparing((SessionResult r) -> r.position() == null)
                            .thenComparing(SessionResult::positionDisplayOrder));
            if (candidate.isPresent()) {
                return Set.of(candidate.get().positionDisplayOrder());
            }
        }
        return Set.of();
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
            BigDecimal sprint = sum(driver.sprintScores.values());
            driver.counted = counted(driver.raceScores, best, raceRounds).add(sprint);
            driver.gross = sum(driver.raceScores.values()).add(sprint);
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

    /** Race scores (round → score) that count under the dropped-scores rule. */
    private static BigDecimal counted(Map<Integer, BigDecimal> raceScores, BestResults best, List<Integer> raceRounds) {
        return switch (best) {
            case All() -> sum(raceScores.values());
            case Season(int count) -> top(raceScores.values(), count);
            case Halves(int firstHalfRaces, int firstCount, int secondCount) -> {
                List<Integer> firstHalf = raceRounds.subList(0, Math.min(firstHalfRaces, raceRounds.size()));
                List<BigDecimal> first = new ArrayList<>();
                List<BigDecimal> second = new ArrayList<>();
                raceScores.forEach((round, score) -> (firstHalf.contains(round) ? first : second).add(score));
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
        /** Sprint points per round (sprints never drop). */
        final Map<Integer, BigDecimal> sprintScores = new TreeMap<>();
        /** Grand Prix finishing positions per round, for countback as it stood at any point. */
        final Map<Integer, List<Integer>> finishesByRound = new TreeMap<>();
        BigDecimal counted = BigDecimal.ZERO;
        BigDecimal gross = BigDecimal.ZERO;

        Driver(String id, String name, String abbreviation) {
            this.id = id;
            this.name = name;
            this.abbreviation = abbreviation;
        }

        void countFinish(int round, int position) {
            if (position <= MAX_COUNTBACK) {
                finishes[position]++;
                finishesByRound.computeIfAbsent(round, r -> new ArrayList<>()).add(position);
            }
        }

        /** Countback as it stood after {@code round}. */
        int[] finishesUpTo(int round) {
            int[] upTo = new int[MAX_COUNTBACK + 1];
            finishesByRound.forEach((r, positions) -> {
                if (r <= round) {
                    positions.forEach(p -> upTo[p]++);
                }
            });
            return upTo;
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
