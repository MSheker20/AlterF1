package com.msheker.alterf1.core;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.stream.Collectors;

import com.msheker.alterf1.core.BestResults.Season;
import com.msheker.alterf1.core.StandingsEngine.Countback;
import com.msheker.alterf1.data.RealConstructorStanding;
import com.msheker.alterf1.data.SessionResult;
import com.msheker.alterf1.data.SessionResult.Session;

/**
 * Computes a constructors' championship from one season of results under any scoring rules.
 * Teams are grouped by chassis + engine manufacturer ({@code constructorId + ":" + engineManufacturerId}).
 * Reuses {@link StandingsEngine}'s race scoring primitives (renumbering, multipliers, fastest-lap
 * transfer, ineligible detection) while applying constructor-specific rules (best-car-only,
 * Indy 500 exclusion, constructor best-N, data-driven constructor exclusions).
 */
public final class ConstructorStandingsEngine {

    /** First season with an official Constructors' Championship; earlier seasons are alternative. */
    public static final int FIRST_CONSTRUCTORS_SEASON = 1958;

    /** True for seasons before 1958, when no official constructors' championship existed. */
    public static boolean isAlternative(int year) {
        return year < FIRST_CONSTRUCTORS_SEASON;
    }

    /** Team key: chassis + engine manufacturer (e.g. {@code "cooper:climax"}). */
    public static String teamId(String constructorId, String engineManufacturerId) {
        return constructorId + ":" + engineManufacturerId;
    }

    /** Team key for a session result row. */
    public static String teamId(SessionResult row) {
        return teamId(row.constructorId(), row.engineManufacturerId());
    }

    /** Display name matching F1DB constructor standings (e.g. "Cooper Climax", or "Ferrari"). */
    public static String teamName(String constructorId, String constructorName,
            String engineManufacturerId, String engineManufacturerName) {
        if (constructorId.equals(engineManufacturerId) || constructorName.equals(engineManufacturerName)) {
            return constructorName;
        }
        return constructorName + " " + engineManufacturerName;
    }

    /**
     * Teams excluded from the constructors' championship for the entire season, read from F1DB's
     * real standings (e.g. 2007 McLaren {@code EX}, 1984 Tyrrell {@code DSQ}). A team that also has
     * a classified row (e.g. 2018 Force India after ownership change) is not treated as fully excluded.
     */
    public static Set<String> excludedTeams(List<RealConstructorStanding> realStandings) {
        Set<String> classified = new HashSet<>();
        Set<String> unclassified = new HashSet<>();
        for (RealConstructorStanding s : realStandings) {
            if (s.position() != null) {
                classified.add(s.teamId());
            } else {
                unclassified.add(s.teamId());
            }
        }
        unclassified.removeAll(classified);
        return Set.copyOf(unclassified);
    }

    // ---- compute -------------------------------------------------------------------------

    /** Championship of a season under a historical system. */
    public List<ConstructorStanding> compute(List<SessionResult> season, ScoringSystem system,
            ScoringOptions options) {
        return compute(season, system, options, Scenario.NONE, Set.of());
    }

    /** Championship of a season under a historical system, after a scenario and data-driven exclusions. */
    public List<ConstructorStanding> compute(List<SessionResult> season, ScoringSystem system,
            ScoringOptions options, Scenario scenario, Set<String> excludedTeams) {
        if (season.isEmpty()) {
            return List.of();
        }
        int year = season.getFirst().year();
        ScoringRules baseRules = rulesFor(season, system, scenario);
        ConstructorRules constructorRules = constructorRulesFor(season, system, scenario);
        return compute(season, baseRules, constructorRules, options,
                system == ScoringSystem.historicalFor(year), scenario, excludedTeams);
    }

    /** Championship of a season under arbitrary (custom) rules. */
    public List<ConstructorStanding> compute(List<SessionResult> season, ScoringRules rules,
            ConstructorRules constructorRules, ScoringOptions options, Scenario scenario, Set<String> excludedTeams) {
        return compute(season, rules, constructorRules, options, false, scenario, excludedTeams);
    }

    /** The base scoring rules a historical system applies to this season's counting (non-Indy) races. */
    public ScoringRules rulesFor(List<SessionResult> season, ScoringSystem system, Scenario scenario) {
        int year = season.getFirst().year();
        int raceCount = (int) raceRounds(season).stream().filter(r -> !scenario.skips(r)).count();
        return system.rulesFor(year, raceCount);
    }

    /** The constructors' rules a historical system applies to this season after the scenario. */
    public ConstructorRules constructorRulesFor(List<SessionResult> season, ScoringSystem system, Scenario scenario) {
        int year = season.getFirst().year();
        int raceCount = (int) raceRounds(season).stream().filter(r -> !scenario.skips(r)).count();
        return system.constructorRulesFor(year, raceCount);
    }

    private List<ConstructorStanding> compute(List<SessionResult> season, ScoringRules baseRules,
            ConstructorRules constructorRules, ScoringOptions options, boolean ownSystem,
            Scenario scenario, Set<String> excludedTeams) {
        if (season.isEmpty()) {
            return List.of();
        }
        Scored scored = score(season, baseRules, constructorRules, options, ownSystem, scenario, excludedTeams);
        return rank(scored.teams().values(), constructorRules.bestResults(), scored.allRaceRounds());
    }

    // ---- season notes --------------------------------------------------------------------

    /** What explains unusual points in this season under a historical system (PLAN.md §7). */
    public Set<SeasonNote> notes(List<SessionResult> season, ScoringSystem system, ScoringOptions options,
            Scenario scenario, Set<String> excludedTeams) {
        if (season.isEmpty()) {
            return Set.of();
        }
        int year = season.getFirst().year();
        ScoringRules baseRules = rulesFor(season, system, scenario);
        ConstructorRules constructorRules = constructorRulesFor(season, system, scenario);
        Scored scored = score(season, baseRules, constructorRules, options,
                system == ScoringSystem.historicalFor(year), scenario, excludedTeams);
        Set<SeasonNote> notes = EnumSet.noneOf(SeasonNote.class);
        notes.addAll(scored.notes());
        if (system != ScoringSystem.S2010 && !scored.sprintRounds().isEmpty()
                && baseRules.sprintPointsFor(1).signum() > 0) {
            notes.add(SeasonNote.SPRINT_ASSUMED);
        }
        if (!system.covers(year) && constructorRules.bestResults() instanceof Season) {
            notes.add(SeasonNote.BEST_SCALED);
        }
        return Set.copyOf(notes);
    }

    /** What explains unusual points in this season under arbitrary (custom) rules. */
    public Set<SeasonNote> notes(List<SessionResult> season, ScoringRules rules, ConstructorRules constructorRules,
            ScoringOptions options, Scenario scenario, Set<String> excludedTeams) {
        if (season.isEmpty()) {
            return Set.of();
        }
        return Set.copyOf(score(season, rules, constructorRules, options, false, scenario, excludedTeams).notes());
    }

    // ---- progression and clinch ----------------------------------------------------------

    /** Constructors' totals after each counting race, and the race where the title was decided. */
    public record Progression(List<Integer> rounds, Set<Integer> scoringSprintRounds,
            Map<String, List<BigDecimal>> totals,
            List<ConstructorStanding> standings, Clinch clinch) {
    }

    /** The constructors' title could no longer be lost after {@code round}. */
    public record Clinch(int round, String teamId) {
    }

    /** Race-by-race constructors' totals under a historical system and scenario. */
    public Progression progression(List<SessionResult> season, ScoringSystem system, ScoringOptions options,
            Scenario scenario, Set<String> excludedTeams) {
        if (season.isEmpty()) {
            return new Progression(List.of(), Set.of(), Map.of(), List.of(), null);
        }
        int year = season.getFirst().year();
        ScoringRules baseRules = rulesFor(season, system, scenario);
        ConstructorRules constructorRules = constructorRulesFor(season, system, scenario);
        return progression(season, baseRules, constructorRules, options,
                system == ScoringSystem.historicalFor(year), scenario, excludedTeams);
    }

    /** Race-by-race constructors' totals under arbitrary (custom) rules and scenario. */
    public Progression progression(List<SessionResult> season, ScoringRules rules, ConstructorRules constructorRules,
            ScoringOptions options, Scenario scenario, Set<String> excludedTeams) {
        if (season.isEmpty()) {
            return new Progression(List.of(), Set.of(), Map.of(), List.of(), null);
        }
        return progression(season, rules, constructorRules, options, false, scenario, excludedTeams);
    }

    private Progression progression(List<SessionResult> season, ScoringRules baseRules,
            ConstructorRules constructorRules, ScoringOptions options, boolean ownSystem,
            Scenario scenario, Set<String> excludedTeams) {
        Scored scored = score(season, baseRules, constructorRules, options, ownSystem, scenario, excludedTeams);
        ScoringRules effectiveRules = constructorRules.applyTo(baseRules);
        List<ConstructorStanding> standings = rank(scored.teams().values(), constructorRules.bestResults(),
                scored.allRaceRounds());
        List<Integer> rounds = scored.raceRounds();

        Map<String, List<BigDecimal>> totals = new LinkedHashMap<>();
        for (ConstructorStanding s : standings) {
            Team team = scored.teams().get(s.teamId());
            List<BigDecimal> line = new ArrayList<>(rounds.size());
            for (int round : rounds) {
                line.add(StandingsEngine.rounded(totalUpTo(team, round, constructorRules.bestResults(),
                        scored.allRaceRounds())));
            }
            totals.put(s.teamId(), line);
        }
        Set<Integer> scoringSprints = effectiveRules.sprintPointsFor(1).signum() > 0
                ? Set.copyOf(scored.sprintRounds()) : Set.of();
        return new Progression(rounds, scoringSprints, totals, standings,
                clinch(scored, effectiveRules, constructorRules, options, excludedTeams));
    }

    private Clinch clinch(Scored scored, ScoringRules effectiveRules, ConstructorRules constructorRules,
            ScoringOptions options, Set<String> excludedTeams) {
        List<Team> eligible = scored.teams().values().stream()
                .filter(t -> !excludedTeams.contains(t.id))
                .toList();
        if (eligible.size() < 2) {
            return null;
        }
        List<Integer> rounds = scored.raceRounds();
        BigDecimal flBonus = options.fastestLap() && constructorRules.fastestLapCounts()
                && effectiveRules.fastestLap() != null ? effectiveRules.fastestLap().points() : BigDecimal.ZERO;

        for (int i = 0; i < rounds.size() - 1; i++) {
            int round = rounds.get(i);
            List<Integer> remaining = rounds.subList(i + 1, rounds.size());
            Team leader = null;
            BigDecimal leaderTotal = BigDecimal.ZERO;
            for (Team team : eligible) {
                BigDecimal total = totalUpTo(team, round, constructorRules.bestResults(), scored.allRaceRounds());
                int byPoints = leader == null ? 1
                        : StandingsEngine.rounded(total).compareTo(StandingsEngine.rounded(leaderTotal));
                if (byPoints > 0 || (byPoints == 0
                        && new Countback(team.finishesUpTo(round)).compareTo(new Countback(leader.finishesUpTo(round))) < 0)) {
                    leader = team;
                    leaderTotal = total;
                }
            }
            if (leader == null || leaderTotal.signum() == 0) {
                continue;
            }
            boolean decided = true;
            for (Team rival : eligible) {
                if (rival == leader) {
                    continue;
                }
                int raceCars = constructorRules.bestCarOnly() ? 1 : Math.max(1, rival.maxRaceCars);
                int sprintCars = constructorRules.bestCarOnly() ? 1
                        : Math.max(1, rival.maxSprintCars > 0 ? rival.maxSprintCars : rival.maxRaceCars);
                BigDecimal bestRace = maxRacePoints(effectiveRules, raceCars, flBonus);
                BigDecimal bestSprint = maxSprintPoints(effectiveRules, sprintCars);

                Map<Integer, BigDecimal> hypothetical = new TreeMap<>(rival.raceScores);
                hypothetical.keySet().removeIf(r -> r > round);
                BigDecimal sprints = StandingsEngine.sumUpTo(rival.sprintScores, round);
                for (int r : remaining) {
                    hypothetical.put(r, bestRace.multiply(
                            scored.multipliers().getOrDefault(r, BigDecimal.ONE).max(BigDecimal.ONE)));
                    if (scored.sprintRounds().contains(r)) {
                        sprints = sprints.add(bestSprint);
                    }
                }
                BigDecimal rivalBest = StandingsEngine.counted(hypothetical, constructorRules.bestResults(),
                        scored.allRaceRounds()).add(sprints);
                int comparison = StandingsEngine.rounded(rivalBest).compareTo(StandingsEngine.rounded(leaderTotal));
                if (comparison > 0) {
                    decided = false;
                    break;
                }
                if (comparison == 0) {
                    int[] rivalFinishes = rival.finishesUpTo(round);
                    for (int pos = 1; pos <= Math.min(raceCars, StandingsEngine.MAX_COUNTBACK); pos++) {
                        rivalFinishes[pos] += remaining.size();
                    }
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

    private static BigDecimal maxRacePoints(ScoringRules rules, int cars, BigDecimal flBonus) {
        BigDecimal total = BigDecimal.ZERO;
        for (int pos = 1; pos <= cars; pos++) {
            total = total.add(rules.racePointsFor(pos));
        }
        return total.add(flBonus);
    }

    private static BigDecimal maxSprintPoints(ScoringRules rules, int cars) {
        BigDecimal total = BigDecimal.ZERO;
        for (int pos = 1; pos <= cars; pos++) {
            total = total.add(rules.sprintPointsFor(pos));
        }
        return total;
    }

    private static BigDecimal totalUpTo(Team t, int round, BestResults best, List<Integer> allRaceRounds) {
        Map<Integer, BigDecimal> soFar = new TreeMap<>(t.raceScores);
        soFar.keySet().removeIf(r -> r > round);
        return StandingsEngine.counted(soFar, best, allRaceRounds)
                .add(StandingsEngine.sumUpTo(t.sprintScores, round));
    }

    // ---- scoring -------------------------------------------------------------------------

    private record Scored(Map<String, Team> teams, List<Integer> allRaceRounds, List<Integer> raceRounds,
            Map<Integer, BigDecimal> multipliers, Set<Integer> sprintRounds, Set<SeasonNote> notes) {
    }

    private Scored score(List<SessionResult> season, ScoringRules baseRules, ConstructorRules constructorRules,
            ScoringOptions options, boolean ownSystem, Scenario scenario, Set<String> excludedTeams) {
        int year = season.getFirst().year();
        ScoringRules realDriverRules = ScoringSystem.historicalFor(year).historical(year);
        ScoringRules effectiveRules = constructorRules.applyTo(baseRules);

        // Indy 500 never counted towards the constructors' championship.
        List<Integer> allRaceRounds = raceRounds(season);
        List<Integer> raceRounds = allRaceRounds.stream().filter(r -> !scenario.skips(r)).toList();
        Set<Integer> activeRounds = new HashSet<>(raceRounds);
        Map<String, Team> teams = new LinkedHashMap<>();

        Map<Integer, List<SessionResult>> racesByRound = season.stream()
                .filter(r -> r.session() == Session.RACE && activeRounds.contains(r.round()))
                .collect(Collectors.groupingBy(SessionResult::round, TreeMap::new, Collectors.toList()));
        Map<Integer, BigDecimal> multipliers = new HashMap<>();
        Set<SeasonNote> notes = EnumSet.noneOf(SeasonNote.class);

        racesByRound.forEach((round, rows) -> {
            RaceFacts facts = RaceFacts.derive(rows, realDriverRules);
            BigDecimal multiplier = StandingsEngine.applicableMultiplier(facts.multiplier, options, ownSystem);
            multipliers.put(round, multiplier);
            if (multiplier.compareTo(BigDecimal.ONE) < 0) {
                notes.add(SeasonNote.HALF_POINTS);
            } else if (multiplier.compareTo(BigDecimal.ONE) > 0) {
                notes.add(SeasonNote.DOUBLE_POINTS);
            }
            scoreRace(rows, effectiveRules, constructorRules, facts, multiplier, options,
                    teams, scenario, excludedTeams, notes);
        });

        Set<Integer> sprintRounds = new HashSet<>();
        if (options.sprints()) {
            season.stream()
                    .filter(r -> r.session() == Session.SPRINT && activeRounds.contains(r.round()))
                    .collect(Collectors.groupingBy(SessionResult::round, TreeMap::new, Collectors.toList()))
                    .forEach((round, rows) -> {
                        sprintRounds.add(round);
                        Map<Integer, Integer> positions = StandingsEngine.renumber(rows, scenario);
                        Map<String, Integer> sprintCarCount = new HashMap<>();
                        Map<String, BigDecimal> roundSprintScores = new HashMap<>();
                        for (SessionResult r : rows) {
                            if (scenario.excludes(r.driverId())) {
                                continue;
                            }
                            Team team = team(teams, r);
                            sprintCarCount.merge(team.id, 1, Integer::sum);
                            if (excludedTeams.contains(team.id)) {
                                notes.add(SeasonNote.INELIGIBLE);
                                continue;
                            }
                            Integer position = positions.get(r.positionDisplayOrder());
                            if (position == null) {
                                continue;
                            }
                            BigDecimal points = effectiveRules.sprintPointsFor(position);
                            roundSprintScores.merge(team.id, points,
                                    constructorRules.bestCarOnly() ? BigDecimal::max : BigDecimal::add);
                        }
                        roundSprintScores.forEach((id, points) ->
                                teams.get(id).sprintScores.merge(round, points, BigDecimal::add));
                        sprintCarCount.forEach((id, count) -> teams.get(id).recordSprintCars(count));
                    });
        }
        return new Scored(teams, allRaceRounds, raceRounds, multipliers, sprintRounds, notes);
    }

    private void scoreRace(List<SessionResult> allRows, ScoringRules effectiveRules, ConstructorRules constructorRules,
            RaceFacts facts, BigDecimal multiplier, ScoringOptions options, Map<String, Team> teams,
            Scenario scenario, Set<String> excludedTeams, Set<SeasonNote> notes) {
        List<SessionResult> rows = allRows.stream().filter(r -> !scenario.excludes(r.driverId())).toList();
        if (rows.isEmpty()) {
            return;
        }
        int round = rows.getFirst().round();
        Map<Integer, Integer> positions = StandingsEngine.renumber(allRows, scenario);
        Map<Integer, Integer> scoringPositions = StandingsEngine.scoringPositions(rows, positions, facts);
        Set<Integer> transferredFastestLap = StandingsEngine.transferFastestLap(allRows, rows, scenario, facts);

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
        FastestLapRule fastestLap = options.fastestLap() && constructorRules.fastestLapCounts()
                ? effectiveRules.fastestLap() : null;

        // Map each unclassified entry to its car identity so shared DNFs are not counted twice.
        // In F1DB a shared-car co-driver row immediately follows its primary driver in display order.
        Map<Integer, Integer> unclassifiedCarKey = unclassifiedCarKeys(allRows);
        Map<String, List<CarEntry>> carsByTeam = new LinkedHashMap<>();
        Map<String, Map<Integer, CarEntry>> sharedByTeamPos = new HashMap<>();
        Map<String, Integer> distinctCarsPerTeam = new HashMap<>();
        Map<String, Set<Integer>> seenPositionsPerTeam = new HashMap<>();
        Map<String, Set<Integer>> seenUnclassifiedCarsPerTeam = new HashMap<>();

        for (SessionResult row : rows) {
            Team team = team(teams, row);
            Integer position = positions.get(row.positionDisplayOrder());
            if (position != null) {
                if (seenPositionsPerTeam.computeIfAbsent(team.id, id -> new HashSet<>()).add(position)) {
                    distinctCarsPerTeam.merge(team.id, 1, Integer::sum);
                }
            } else {
                Integer carKey = unclassifiedCarKey.get(row.positionDisplayOrder());
                if (carKey != null
                        && seenUnclassifiedCarsPerTeam.computeIfAbsent(team.id, id -> new HashSet<>()).add(carKey)) {
                    distinctCarsPerTeam.merge(team.id, 1, Integer::sum);
                }
            }

            if (excludedTeams.contains(team.id)) {
                notes.add(SeasonNote.INELIGIBLE);
                team.raceScores.merge(round, BigDecimal.ZERO, BigDecimal::add);
                continue;
            }
            if (facts.ineligible(row)) {
                notes.add(SeasonNote.INELIGIBLE);
                team.raceScores.merge(round, BigDecimal.ZERO, BigDecimal::add);
                continue;
            }

            BigDecimal score = BigDecimal.ZERO;
            if (position != null) {
                long sharing = carsAtPosition.getOrDefault(position, 1L);
                BigDecimal share;
                if (sharing == 1) {
                    share = BigDecimal.ONE;
                } else if (effectiveRules.sharedDrive() == SharedDriveRule.NO_POINTS) {
                    share = BigDecimal.ZERO;
                } else {
                    share = brokenSharedPositions.contains(row.position()) ? null : facts.pointsShare(row);
                    if (share == null) {
                        share = BigDecimal.ONE.divide(BigDecimal.valueOf(sharing), StandingsEngine.SCALE,
                                RoundingMode.HALF_EVEN);
                    }
                }
                BigDecimal positionPoints = effectiveRules.racePointsFor(
                        scoringPositions.get(row.positionDisplayOrder()));
                if (share.compareTo(BigDecimal.ONE) < 0 && share.signum() > 0 && positionPoints.signum() > 0) {
                    notes.add(SeasonNote.SHARED_POINTS);
                }
                score = score.add(positionPoints.multiply(share));
            }

            boolean transferred = transferredFastestLap.contains(row.positionDisplayOrder());
            if (fastestLap != null && (row.fastestLap() || transferred) && fastestLap.eligible(position)) {
                BigDecimal share = transferred || fastestLapShareBroken ? null : facts.fastestLapShare(row);
                if (share == null) {
                    share = fastestLap.splitWhenShared() && fastestLapCount > 1
                            ? BigDecimal.ONE.divide(BigDecimal.valueOf(fastestLapCount), StandingsEngine.SCALE,
                                    RoundingMode.HALF_EVEN)
                            : BigDecimal.ONE;
                }
                if (share.compareTo(BigDecimal.ONE) < 0 && share.signum() > 0) {
                    notes.add(SeasonNote.SHARED_POINTS);
                }
                score = score.add(fastestLap.points().multiply(share));
            }

            if (position != null) {
                Map<Integer, CarEntry> byPos = sharedByTeamPos.computeIfAbsent(team.id, id -> new HashMap<>());
                CarEntry existing = byPos.get(position);
                if (existing != null) {
                    existing.score = existing.score.add(score);
                } else {
                    CarEntry entry = new CarEntry(position, score);
                    byPos.put(position, entry);
                    carsByTeam.computeIfAbsent(team.id, id -> new ArrayList<>()).add(entry);
                }
            } else if (score.signum() > 0) {
                carsByTeam.computeIfAbsent(team.id, id -> new ArrayList<>()).add(new CarEntry(null, score));
            }
        }

        distinctCarsPerTeam.forEach((id, count) -> teams.get(id).recordRaceCars(count));

        carsByTeam.forEach((teamId, cars) -> {
            Team team = teams.get(teamId);
            if (constructorRules.bestCarOnly()) {
                CarEntry best = cars.stream()
                        .max(Comparator.comparing((CarEntry c) -> c.score)
                                .thenComparing(c -> c.position == null ? Integer.MIN_VALUE : -c.position))
                        .orElseThrow();
                team.raceScores.merge(round, best.score.multiply(multiplier), BigDecimal::add);
                if (best.position != null) {
                    team.countFinish(round, best.position);
                }
            } else {
                BigDecimal total = BigDecimal.ZERO;
                for (CarEntry car : cars) {
                    total = total.add(car.score);
                    if (car.position != null) {
                        team.countFinish(round, car.position);
                    }
                }
                team.raceScores.merge(round, total.multiply(multiplier), BigDecimal::add);
            }
        });
    }

    // ---- ranking -------------------------------------------------------------------------

    private List<ConstructorStanding> rank(Iterable<Team> teams, BestResults best, List<Integer> allRaceRounds) {
        List<Team> sorted = new ArrayList<>();
        for (Team team : teams) {
            BigDecimal sprint = StandingsEngine.sum(team.sprintScores.values());
            team.counted = StandingsEngine.counted(team.raceScores, best, allRaceRounds).add(sprint);
            team.gross = StandingsEngine.sum(team.raceScores.values()).add(sprint);
            sorted.add(team);
        }
        Comparator<Team> order = Comparator.comparing((Team t) -> StandingsEngine.rounded(t.counted)).reversed()
                .thenComparing(Team::countback)
                .thenComparing(t -> t.name);
        sorted.sort(order);

        List<ConstructorStanding> standings = new ArrayList<>(sorted.size());
        for (int i = 0; i < sorted.size(); i++) {
            Team t = sorted.get(i);
            int position = i + 1;
            if (i > 0 && tied(t, sorted.get(i - 1))) {
                position = standings.get(i - 1).position();
            }
            standings.add(new ConstructorStanding(position, t.id, t.constructorId, t.engineManufacturerId,
                    t.name, StandingsEngine.rounded(t.counted), StandingsEngine.rounded(t.gross),
                    t.finishes[1], t.finishes[1] + t.finishes[2] + t.finishes[3]));
        }
        return standings;
    }

    private static boolean tied(Team a, Team b) {
        return StandingsEngine.rounded(a.counted).compareTo(StandingsEngine.rounded(b.counted)) == 0
                && a.countback().compareTo(b.countback()) == 0;
    }

    /** Grand Prix rounds of the season that count for constructors (never Indy 500). */
    private static List<Integer> raceRounds(List<SessionResult> season) {
        return season.stream()
                .filter(r -> r.session() == Session.RACE && !r.indy500())
                .map(SessionResult::round)
                .distinct()
                .sorted()
                .toList();
    }

    /**
     * Assigns each unclassified ({@code position == null}) row a car key based on display order and
     * {@link SessionResult#sharedCar()}. A shared co-driver row immediately following a same-team
     * unclassified row inherits its car key; an orphan shared row with no safe car identity is
     * omitted so it is not counted as an extra car.
     */
    private static Map<Integer, Integer> unclassifiedCarKeys(List<SessionResult> allRows) {
        List<SessionResult> ordered = allRows.stream()
                .sorted(Comparator.comparingInt(SessionResult::positionDisplayOrder))
                .toList();
        Map<Integer, Integer> keys = new HashMap<>();
        SessionResult prev = null;
        Integer prevKey = null;
        for (SessionResult row : ordered) {
            Integer key = null;
            if (!row.classified()) {
                if (!row.sharedCar()) {
                    key = row.positionDisplayOrder();
                } else if (prev != null && !prev.classified() && teamId(prev).equals(teamId(row))) {
                    key = prevKey;
                }
                if (key != null) {
                    keys.put(row.positionDisplayOrder(), key);
                }
            }
            prev = row;
            prevKey = key;
        }
        return keys;
    }

    private static Team team(Map<String, Team> teams, SessionResult row) {
        String id = teamId(row);
        return teams.computeIfAbsent(id, k -> new Team(k, row.constructorId(), row.engineManufacturerId(),
                teamName(row.constructorId(), row.constructorName(),
                        row.engineManufacturerId(), row.engineManufacturerName())));
    }

    private static final class CarEntry {
        final Integer position;
        BigDecimal score;

        CarEntry(Integer position, BigDecimal score) {
            this.position = position;
            this.score = score;
        }
    }

    private static final class Team {
        final String id;
        final String constructorId;
        final String engineManufacturerId;
        final String name;
        final Map<Integer, BigDecimal> raceScores = new TreeMap<>();
        final Map<Integer, BigDecimal> sprintScores = new TreeMap<>();
        final int[] finishes = new int[StandingsEngine.MAX_COUNTBACK + 1];
        final Map<Integer, List<Integer>> finishesByRound = new TreeMap<>();
        int maxRaceCars = 0;
        int maxSprintCars = 0;
        BigDecimal counted = BigDecimal.ZERO;
        BigDecimal gross = BigDecimal.ZERO;

        Team(String id, String constructorId, String engineManufacturerId, String name) {
            this.id = id;
            this.constructorId = constructorId;
            this.engineManufacturerId = engineManufacturerId;
            this.name = name;
        }

        void recordRaceCars(int count) {
            if (count > maxRaceCars) {
                maxRaceCars = count;
            }
        }

        void recordSprintCars(int count) {
            if (count > maxSprintCars) {
                maxSprintCars = count;
            }
        }

        void countFinish(int round, int position) {
            if (position <= StandingsEngine.MAX_COUNTBACK) {
                finishes[position]++;
                finishesByRound.computeIfAbsent(round, r -> new ArrayList<>()).add(position);
            }
        }

        int[] finishesUpTo(int round) {
            int[] upTo = new int[StandingsEngine.MAX_COUNTBACK + 1];
            finishesByRound.forEach((r, positions) -> {
                if (r <= round) {
                    positions.forEach(p -> upTo[p]++);
                }
            });
            return upTo;
        }

        Countback countback() {
            return new Countback(finishes);
        }
    }
}
