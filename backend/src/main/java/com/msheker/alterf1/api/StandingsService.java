package com.msheker.alterf1.api;

import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.msheker.alterf1.api.StandingsDtos.BestResultsInfo;
import com.msheker.alterf1.api.StandingsDtos.Champion;
import com.msheker.alterf1.api.StandingsDtos.CustomInfo;
import com.msheker.alterf1.api.StandingsDtos.DriverRef;
import com.msheker.alterf1.api.StandingsDtos.Entrant;
import com.msheker.alterf1.api.StandingsDtos.FastestLapInfo;
import com.msheker.alterf1.api.StandingsDtos.RaceInfo;
import com.msheker.alterf1.api.StandingsDtos.RulesInfo;
import com.msheker.alterf1.api.StandingsDtos.ScenarioInfo;
import com.msheker.alterf1.api.StandingsDtos.SeasonSummary;
import com.msheker.alterf1.api.StandingsDtos.StandingLine;
import com.msheker.alterf1.api.StandingsDtos.StandingsResponse;
import com.msheker.alterf1.api.StandingsDtos.SystemInfo;
import com.msheker.alterf1.core.BestResults;
import com.msheker.alterf1.core.CustomSystem;
import com.msheker.alterf1.core.DriverStanding;
import com.msheker.alterf1.core.Scenario;
import com.msheker.alterf1.core.ScoringOptions;
import com.msheker.alterf1.core.ScoringRules;
import com.msheker.alterf1.core.ScoringSystem;
import com.msheker.alterf1.core.StandingsEngine;
import com.msheker.alterf1.data.RealStanding;
import com.msheker.alterf1.data.SeasonChampion;
import com.msheker.alterf1.data.SeasonResultsRepository;
import com.msheker.alterf1.data.SessionResult;
import com.msheker.alterf1.data.SessionResult.Session;

/** Reads a season (one query) and scores it in memory under the requested system and scenario. */
@Service
public class StandingsService {

    private final SeasonResultsRepository repository;
    private final StandingsEngine engine = new StandingsEngine();

    public StandingsService(SeasonResultsRepository repository) {
        this.repository = repository;
    }

    public List<SeasonSummary> seasons() {
        Map<Integer, SeasonChampion> champions = repository.findChampions().stream()
                .collect(Collectors.toMap(SeasonChampion::year, Function.identity(), (a, b) -> a));
        return repository.findSeasons().stream()
                .map(year -> {
                    SeasonChampion c = champions.get(year);
                    return new SeasonSummary(year, c == null ? null : new DriverRef(c.driverId(), c.driverName()));
                })
                .toList();
    }

    public List<SystemInfo> systems() {
        return Arrays.stream(ScoringSystem.values())
                .map(s -> new SystemInfo(s.id(), s.firstSeason(), s.lastSeason(),
                        s.rulesFor(s.firstSeason(), 0).racePoints()))
                .toList();
    }

    public StandingsResponse standings(int year, StandingsQuery query) {
        // Validate everything that does not need data first: bad input is a 400 even for a missing season.
        ScoringSystem system = query.isCustom() ? null : query.scoringSystem();
        CustomSystem custom = query.isCustom() ? query.customSystem() : null;
        ScoringOptions options = query.options();
        Set<String> excluded = query.excludedDrivers();
        Set<Integer> skipped = query.skippedRounds();

        List<SessionResult> results = repository.findBySeason(year);
        if (results.isEmpty()) {
            throw new SeasonNotFoundException(year);
        }
        validateScenario(year, results, excluded, skipped);

        // Rules come from the engine itself, so the echo matches what was really applied.
        ScoringRules rules = custom != null ? custom.rules()
                : engine.rulesFor(results, system, options, new Scenario(excluded, skipped, Map.of()));
        // The fastest-lap ranking is only needed to pass on a removed driver's bonus.
        boolean needsRanking = !excluded.isEmpty() && options.fastestLap() && rules.fastestLap() != null;
        Scenario scenario = new Scenario(excluded, skipped,
                needsRanking ? repository.findFastestLapRanking(year) : Map.of());
        List<DriverStanding> computed = custom != null
                ? engine.compute(results, rules, options, scenario)
                : engine.compute(results, system, options, scenario);
        if (computed.isEmpty()) {
            throw new BadRequestException("Nothing left to score in %d with this scenario.".formatted(year));
        }

        List<RaceInfo> races = races(results, skipped);
        Map<String, RealStanding> real = repository.findRealStandings(year).stream()
                .collect(Collectors.toMap(RealStanding::driverId, Function.identity(), (a, b) -> a));
        Map<String, List<String>> resultsByDriver = resultsByDriver(results, races, scenario);
        Map<String, String> constructorNames = new HashMap<>();
        results.forEach(r -> constructorNames.putIfAbsent(r.constructorId(), r.constructorName()));

        List<StandingLine> lines = computed.stream()
                .map(s -> {
                    RealStanding r = real.get(s.driverId());
                    Integer realPosition = r == null ? null : r.position();
                    return new StandingLine(
                            s.position(),
                            realPosition,
                            realPosition == null ? null : realPosition - s.position(),
                            s.driverId(),
                            s.driverName(),
                            s.driverAbbreviation(),
                            s.constructorId(),
                            constructorNames.get(s.constructorId()),
                            s.points(),
                            r == null ? null : r.points(),
                            s.wins(),
                            s.podiums(),
                            // A driver with only sprint results still gets one entry per race.
                            resultsByDriver.getOrDefault(s.driverId(), Collections.nCopies(races.size(), "")));
                })
                .toList();

        Champion realChampion = repository.findChampion(year)
                .map(c -> new Champion(c.driverId(), c.driverName(), c.points()))
                .orElse(null);
        // Drivers tied on points and countback share P1. If the real champion is among them,
        // name him and do not claim the title changed.
        List<DriverStanding> leaders = computed.stream().filter(s -> s.position() == 1).toList();
        DriverStanding top = realChampion == null ? leaders.getFirst()
                : leaders.stream().filter(s -> s.driverId().equals(realChampion.driverId())).findFirst()
                        .orElse(leaders.getFirst());
        Champion champion = new Champion(top.driverId(), top.driverName(), top.points());
        boolean changed = realChampion != null && !realChampion.driverId().equals(champion.driverId());

        ScenarioInfo scenarioInfo = new ScenarioInfo(List.copyOf(excluded), skipped.stream().sorted().toList(),
                options.sprints(), options.fastestLap(), query.presetValue().id(),
                custom == null ? null : new CustomInfo(custom.racePoints(), custom.fastestLap(),
                        custom.sprint().id(), custom.bestResults()));

        return new StandingsResponse(year, query.isCustom() ? StandingsQuery.CUSTOM : system.id(),
                ScoringSystem.historicalFor(year).id(), query.presetValue().id(), scenarioInfo, rulesInfo(rules),
                races, entrants(results, real, excluded), champion, realChampion, changed, lines);
    }

    private static void validateScenario(int year, List<SessionResult> results, Set<String> excluded,
            Set<Integer> skipped) {
        Set<String> driverIds = results.stream().map(SessionResult::driverId).collect(Collectors.toSet());
        for (String id : excluded) {
            if (!driverIds.contains(id)) {
                throw new BadRequestException("exclude", "Unknown driver '%s' in %d.".formatted(id, year));
            }
        }
        Set<Integer> rounds = results.stream().filter(r -> r.session() == Session.RACE)
                .map(SessionResult::round).collect(Collectors.toSet());
        for (int round : skipped) {
            if (!rounds.contains(round)) {
                throw new BadRequestException("skip", "Unknown round %d in %d.".formatted(round, year));
            }
        }
        if (skipped.containsAll(rounds)) {
            throw new BadRequestException("skip", "At least one race must remain in %d.".formatted(year));
        }
    }

    private static RulesInfo rulesInfo(ScoringRules rules) {
        FastestLapInfo fastestLap = rules.fastestLap() == null ? null
                : new FastestLapInfo(rules.fastestLap().points(), rules.fastestLap().maxPosition());
        BestResultsInfo best = switch (rules.bestResults()) {
            case BestResults.All() -> new BestResultsInfo("all", null, null, null, null);
            case BestResults.Season(int count) -> new BestResultsInfo("season", count, null, null, null);
            case BestResults.Halves(int firstHalfRaces, int firstCount, int secondCount) ->
                    new BestResultsInfo("halves", null, firstHalfRaces, firstCount, secondCount);
        };
        return new RulesInfo(rules.racePoints(), rules.sprintPoints(), fastestLap, best);
    }

    private static List<RaceInfo> races(List<SessionResult> results, Set<Integer> skipped) {
        Set<Integer> sprintRounds = results.stream().filter(r -> r.session() == Session.SPRINT)
                .map(SessionResult::round).collect(Collectors.toSet());
        Map<Integer, RaceInfo> byRound = new LinkedHashMap<>();
        results.stream()
                .filter(r -> r.session() == Session.RACE)
                .sorted(Comparator.comparingInt(SessionResult::round))
                .forEach(r -> byRound.putIfAbsent(r.round(),
                        new RaceInfo(r.round(), r.grandPrixId(), r.grandPrixCode(), r.raceDate(),
                                sprintRounds.contains(r.round()), skipped.contains(r.round()))));
        return List.copyOf(byRound.values());
    }

    /** Everyone who took part, in real-standings order then by name; their most frequent team. */
    private static List<Entrant> entrants(List<SessionResult> results, Map<String, RealStanding> real,
            Set<String> excluded) {
        Map<String, SessionResult> first = new LinkedHashMap<>();
        Map<String, Map<String, Integer>> teams = new HashMap<>();
        for (SessionResult r : results) {
            first.putIfAbsent(r.driverId(), r);
            teams.computeIfAbsent(r.driverId(), id -> new HashMap<>()).merge(r.constructorId(), 1, Integer::sum);
        }
        Map<String, String> constructorNames = new HashMap<>();
        results.forEach(r -> constructorNames.putIfAbsent(r.constructorId(), r.constructorName()));
        return first.values().stream()
                .sorted(Comparator.comparing((SessionResult r) -> {
                    RealStanding s = real.get(r.driverId());
                    return s == null || s.position() == null ? Integer.MAX_VALUE : s.position();
                }).thenComparing(SessionResult::driverName))
                .map(r -> {
                    String team = teams.get(r.driverId()).entrySet().stream()
                            .max(Map.Entry.comparingByValue()).map(Map.Entry::getKey).orElse(r.constructorId());
                    return new Entrant(r.driverId(), r.driverName(), r.driverAbbreviation(), team,
                            constructorNames.get(team), excluded.contains(r.driverId()));
                })
                .toList();
    }

    /**
     * Each driver's Grand Prix result per race, in race order; a driver's best car when he had two.
     * Finishing positions are renumbered by the scenario, so they match the points shown.
     */
    private static Map<String, List<String>> resultsByDriver(List<SessionResult> results, List<RaceInfo> races,
            Scenario scenario) {
        Map<Integer, Map<Integer, Integer>> positionsByRound = new HashMap<>();
        results.stream()
                .filter(r -> r.session() == Session.RACE)
                .collect(Collectors.groupingBy(SessionResult::round))
                .forEach((round, rows) -> positionsByRound.put(round, StandingsEngine.renumber(rows, scenario)));
        Map<String, Map<Integer, SessionResult>> best = new HashMap<>();
        results.stream()
                .filter(r -> r.session() == Session.RACE && !scenario.excludes(r.driverId()))
                .forEach(r -> best.computeIfAbsent(r.driverId(), id -> new HashMap<>())
                        .merge(r.round(), r, StandingsService::better));
        Map<String, List<String>> out = new HashMap<>();
        best.forEach((driverId, byRound) -> out.put(driverId, races.stream()
                .map(race -> {
                    SessionResult r = byRound.get(race.round());
                    if (r == null) {
                        return "";
                    }
                    Integer position = positionsByRound.get(race.round()).get(r.positionDisplayOrder());
                    return position == null ? r.positionText() : String.valueOf(position);
                })
                .toList()));
        return out;
    }

    private static SessionResult better(SessionResult a, SessionResult b) {
        if (a.position() == null) {
            return b;
        }
        if (b.position() == null) {
            return a;
        }
        return a.position() <= b.position() ? a : b;
    }
}
