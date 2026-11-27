package com.msheker.alterf1.api;

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

import com.msheker.alterf1.api.ConstructorStandingsDtos.ConstructorChampion;
import com.msheker.alterf1.api.ConstructorStandingsDtos.ConstructorClinchInfo;
import com.msheker.alterf1.api.ConstructorStandingsDtos.ConstructorCompareResponse;
import com.msheker.alterf1.api.ConstructorStandingsDtos.ConstructorCompareSystem;
import com.msheker.alterf1.api.ConstructorStandingsDtos.ConstructorCompareTeam;
import com.msheker.alterf1.api.ConstructorStandingsDtos.ConstructorProgressionResponse;
import com.msheker.alterf1.api.ConstructorStandingsDtos.ConstructorRulesInfo;
import com.msheker.alterf1.api.ConstructorStandingsDtos.ConstructorStandingLine;
import com.msheker.alterf1.api.ConstructorStandingsDtos.ConstructorStandingsResponse;
import com.msheker.alterf1.api.ConstructorStandingsDtos.ProgressionTeam;
import com.msheker.alterf1.api.StandingsDtos.CompareCell;
import com.msheker.alterf1.api.StandingsDtos.CustomInfo;
import com.msheker.alterf1.api.StandingsDtos.ProgressionRace;
import com.msheker.alterf1.api.StandingsDtos.RaceInfo;
import com.msheker.alterf1.api.StandingsDtos.ScenarioInfo;
import com.msheker.alterf1.core.ConstructorRules;
import com.msheker.alterf1.core.ConstructorStanding;
import com.msheker.alterf1.core.ConstructorStandingsEngine;
import com.msheker.alterf1.core.CustomSystem;
import com.msheker.alterf1.core.Scenario;
import com.msheker.alterf1.core.ScoringOptions;
import com.msheker.alterf1.core.ScoringRules;
import com.msheker.alterf1.core.ScoringSystem;
import com.msheker.alterf1.core.SeasonNote;
import com.msheker.alterf1.core.StandingsEngine;
import com.msheker.alterf1.data.RealConstructorStanding;
import com.msheker.alterf1.data.RealStanding;
import com.msheker.alterf1.data.SeasonResultsRepository;
import com.msheker.alterf1.data.SessionResult;
import com.msheker.alterf1.data.SessionResult.Session;

/** Reads a season and computes the constructors' championship in memory under any system and scenario. */
@Service
public class ConstructorStandingsService {

    private final SeasonResultsRepository repository;
    private final ConstructorStandingsEngine engine = new ConstructorStandingsEngine();

    public ConstructorStandingsService(SeasonResultsRepository repository) {
        this.repository = repository;
    }

    public ConstructorStandingsResponse standings(int year, StandingsQuery query) {
        ScoringSystem system = query.isCustom() ? null : query.scoringSystem();
        CustomSystem custom = query.isCustom() ? query.customSystem() : null;
        ScoringOptions options = query.options();
        Set<String> excluded = query.excludedDrivers();
        Set<Integer> skipped = query.skippedRounds();

        List<SessionResult> results = seasonResults(year);
        StandingsService.validateScenario(year, results, excluded, skipped);

        Scenario baseScenario = new Scenario(excluded, skipped, Map.of());
        ScoringRules baseRules = custom != null ? custom.rules() : engine.rulesFor(results, system, baseScenario);
        ConstructorRules constructorRules = custom != null ? custom.constructorRules()
                : engine.constructorRulesFor(results, system, baseScenario);
        ScoringRules effectiveRules = constructorRules.applyTo(baseRules);

        boolean needsRanking = !excluded.isEmpty() && options.fastestLap() && effectiveRules.fastestLap() != null;
        Scenario scenario = new Scenario(excluded, skipped,
                needsRanking ? repository.findFastestLapRanking(year) : Map.of());

        boolean alternative = ConstructorStandingsEngine.isAlternative(year);
        List<RealConstructorStanding> realList = alternative ? List.of() : repository.findRealConstructorStandings(year);
        Set<String> excludedTeams = ConstructorStandingsEngine.excludedTeams(realList);

        List<ConstructorStanding> computed = custom != null
                ? engine.compute(results, baseRules, constructorRules, options, scenario, excludedTeams)
                : engine.compute(results, system, options, scenario, excludedTeams);
        if (computed.isEmpty()) {
            throw new BadRequestException("Nothing left to score in %d with this scenario.".formatted(year));
        }

        Set<SeasonNote> notes = custom != null
                ? engine.notes(results, baseRules, constructorRules, options, scenario, excludedTeams)
                : engine.notes(results, system, options, scenario, excludedTeams);

        List<RaceInfo> races = StandingsService.races(results, skipped);
        Map<String, RealConstructorStanding> realByTeam = indexByTeam(realList);
        Map<String, RealStanding> realDrivers = repository.findRealStandings(year).stream()
                .collect(Collectors.toMap(RealStanding::driverId, Function.identity(), (a, b) -> a));
        Map<String, List<String>> resultsByTeam = resultsByTeam(results, races, scenario);

        List<ConstructorStandingLine> lines = computed.stream()
                .map(s -> {
                    RealConstructorStanding r = realByTeam.get(s.teamId());
                    Integer realPosition = r == null ? null : r.position();
                    return new ConstructorStandingLine(
                            s.position(),
                            realPosition,
                            realPosition == null ? null : realPosition - s.position(),
                            s.teamId(),
                            s.constructorId(),
                            s.engineManufacturerId(),
                            s.name(),
                            s.points(),
                            r == null ? null : r.points(),
                            s.wins(),
                            s.podiums(),
                            resultsByTeam.getOrDefault(s.teamId(), Collections.nCopies(races.size(), "")));
                })
                .toList();

        ConstructorChampion realChampion = realChampion(realList);
        ConstructorChampion champion = champion(computed, realChampion);
        boolean changed = realChampion != null && !realChampion.teamId().equals(champion.teamId());

        ScenarioInfo scenarioInfo = new ScenarioInfo(List.copyOf(excluded), skipped.stream().sorted().toList(),
                options.sprints(), options.fastestLap(), query.presetValue().id(),
                custom == null ? null : new CustomInfo(custom.racePoints(), custom.fastestLap(),
                        custom.sprint().id(), custom.bestResults()));
        ConstructorRulesInfo constructorRulesInfo = new ConstructorRulesInfo(
                constructorRules.bestCarOnly(),
                StandingsService.bestResultsInfo(constructorRules.bestResults()));

        return new ConstructorStandingsResponse(
                year,
                query.isCustom() ? StandingsQuery.CUSTOM : system.id(),
                ScoringSystem.historicalFor(year).id(),
                query.presetValue().id(),
                alternative,
                scenarioInfo,
                StandingsService.rulesInfo(effectiveRules),
                constructorRulesInfo,
                races,
                StandingsService.entrants(results, realDrivers, excluded),
                champion,
                realChampion,
                changed,
                notes.stream().sorted().map(SeasonNote::id).toList(),
                lines);
    }

    /** The same season and scenario under every historical system (and the custom one, if given). */
    public ConstructorCompareResponse compare(int year, StandingsQuery query) {
        ScoringOptions options = query.options();
        Set<String> excluded = query.excludedDrivers();
        Set<Integer> skipped = query.skippedRounds();
        CustomSystem custom = query.hasCustomPoints() ? query.customSystem() : null;

        List<SessionResult> results = seasonResults(year);
        StandingsService.validateScenario(year, results, excluded, skipped);
        Scenario scenario = new Scenario(excluded, skipped,
                !excluded.isEmpty() && options.fastestLap() ? repository.findFastestLapRanking(year) : Map.of());

        boolean alternative = ConstructorStandingsEngine.isAlternative(year);
        List<RealConstructorStanding> realList = alternative ? List.of() : repository.findRealConstructorStandings(year);
        Set<String> excludedTeams = ConstructorStandingsEngine.excludedTeams(realList);

        Map<String, List<ConstructorStanding>> bySystem = new LinkedHashMap<>();
        for (ScoringSystem system : ScoringSystem.values()) {
            bySystem.put(system.id(), engine.compute(results, system, options, scenario, excludedTeams));
        }
        if (custom != null) {
            bySystem.put(StandingsQuery.CUSTOM, engine.compute(results, custom.rules(), custom.constructorRules(),
                    options, scenario, excludedTeams));
        }
        if (bySystem.values().iterator().next().isEmpty()) {
            throw new BadRequestException("Nothing left to score in %d with this scenario.".formatted(year));
        }

        ConstructorChampion realChampion = realChampion(realList);
        List<ConstructorCompareSystem> systems = bySystem.entrySet().stream()
                .map(e -> {
                    ConstructorChampion champion = champion(e.getValue(), realChampion);
                    return new ConstructorCompareSystem(e.getKey(), champion,
                            realChampion != null && !realChampion.teamId().equals(champion.teamId()));
                })
                .toList();

        Map<String, RealConstructorStanding> realByTeam = indexByTeam(realList);
        Map<String, ConstructorStanding> anyLine = new LinkedHashMap<>();
        Map<String, Map<String, CompareCell>> cells = new HashMap<>();
        bySystem.forEach((systemId, standings) -> standings.forEach(s -> {
            anyLine.putIfAbsent(s.teamId(), s);
            cells.computeIfAbsent(s.teamId(), id -> new LinkedHashMap<>())
                    .put(systemId, new CompareCell(s.position(), s.points()));
        }));

        String realSystemId = ScoringSystem.historicalFor(year).id();
        List<ConstructorCompareTeam> teams = anyLine.values().stream()
                .filter(s -> realByTeam.containsKey(s.teamId())
                        || cells.get(s.teamId()).values().stream().anyMatch(c -> c.points().signum() > 0))
                .map(s -> {
                    RealConstructorStanding r = realByTeam.get(s.teamId());
                    return new ConstructorCompareTeam(s.teamId(), s.constructorId(), s.engineManufacturerId(),
                            s.name(), r == null ? null : r.position(), cells.get(s.teamId()));
                })
                .sorted(Comparator
                        .comparing((ConstructorCompareTeam t) -> t.realPosition() == null ? Integer.MAX_VALUE
                                : t.realPosition())
                        .thenComparing(t -> {
                            CompareCell c = t.cells().get(realSystemId);
                            return c == null ? Integer.MAX_VALUE : c.position();
                        })
                        .thenComparing(ConstructorCompareTeam::teamName))
                .toList();

        return new ConstructorCompareResponse(year, realSystemId, alternative, systems, teams);
    }

    /** Constructors' totals race by race under one system and scenario, with the race that decided it. */
    public ConstructorProgressionResponse progression(int year, StandingsQuery query) {
        ScoringSystem system = query.isCustom() ? null : query.scoringSystem();
        CustomSystem custom = query.isCustom() ? query.customSystem() : null;
        ScoringOptions options = query.options();
        Set<String> excluded = query.excludedDrivers();
        Set<Integer> skipped = query.skippedRounds();

        List<SessionResult> results = seasonResults(year);
        StandingsService.validateScenario(year, results, excluded, skipped);
        Scenario scenario = new Scenario(excluded, skipped,
                !excluded.isEmpty() && options.fastestLap() ? repository.findFastestLapRanking(year) : Map.of());

        boolean alternative = ConstructorStandingsEngine.isAlternative(year);
        List<RealConstructorStanding> realList = alternative ? List.of() : repository.findRealConstructorStandings(year);
        Set<String> excludedTeams = ConstructorStandingsEngine.excludedTeams(realList);

        ConstructorStandingsEngine.Progression progression = custom != null
                ? engine.progression(results, custom.rules(), custom.constructorRules(), options, scenario, excludedTeams)
                : engine.progression(results, system, options, scenario, excludedTeams);
        if (progression.standings().isEmpty()) {
            throw new BadRequestException("Nothing left to score in %d with this scenario.".formatted(year));
        }

        Map<Integer, String> codes = new HashMap<>();
        for (SessionResult r : results) {
            if (r.session() == Session.RACE) {
                codes.putIfAbsent(r.round(), r.grandPrixCode());
            }
        }
        Set<Integer> sprintRounds = progression.scoringSprintRounds();
        List<ProgressionRace> races = progression.rounds().stream()
                .map(round -> new ProgressionRace(round, codes.get(round), sprintRounds.contains(round)))
                .toList();
        List<ProgressionTeam> teams = progression.standings().stream()
                .filter(s -> s.points().signum() > 0)
                .map(s -> new ProgressionTeam(s.teamId(), s.constructorId(), s.engineManufacturerId(),
                        s.name(), s.position(), progression.totals().get(s.teamId())))
                .toList();
        ConstructorStandingsEngine.Clinch clinch = progression.clinch();

        return new ConstructorProgressionResponse(
                year,
                query.isCustom() ? StandingsQuery.CUSTOM : system.id(),
                alternative,
                races,
                teams,
                clinch == null ? null : new ConstructorClinchInfo(clinch.round(), codes.get(clinch.round()), clinch.teamId()));
    }

    private List<SessionResult> seasonResults(int year) {
        List<SessionResult> results = repository.findBySeason(year);
        if (results.isEmpty()) {
            throw new SeasonNotFoundException(year);
        }
        // Indy 500 never counted towards the constructors' championship.
        return results.stream().filter(r -> !r.indy500()).toList();
    }

    private static Map<String, RealConstructorStanding> indexByTeam(List<RealConstructorStanding> realList) {
        return realList.stream()
                .collect(Collectors.toMap(RealConstructorStanding::teamId, Function.identity(), (a, b) -> a));
    }

    private static ConstructorChampion realChampion(List<RealConstructorStanding> realList) {
        return realList.stream()
                .filter(RealConstructorStanding::championshipWon)
                .findFirst()
                .map(c -> new ConstructorChampion(c.teamId(), c.constructorId(), c.engineManufacturerId(),
                        c.teamName(), c.points()))
                .orElse(null);
    }

    static ConstructorChampion champion(List<ConstructorStanding> computed, ConstructorChampion realChampion) {
        List<ConstructorStanding> leaders = computed.stream().filter(s -> s.position() == 1).toList();
        ConstructorStanding top = realChampion == null ? leaders.getFirst()
                : leaders.stream().filter(s -> s.teamId().equals(realChampion.teamId())).findFirst()
                        .orElse(leaders.getFirst());
        return new ConstructorChampion(top.teamId(), top.constructorId(), top.engineManufacturerId(),
                top.name(), top.points());
    }

    /**
     * Each team's best Grand Prix result per race, in race order, renumbered by the scenario.
     */
    private static Map<String, List<String>> resultsByTeam(List<SessionResult> results, List<RaceInfo> races,
            Scenario scenario) {
        Map<Integer, Map<Integer, Integer>> positionsByRound = new HashMap<>();
        results.stream()
                .filter(r -> r.session() == Session.RACE)
                .collect(Collectors.groupingBy(SessionResult::round))
                .forEach((round, rows) -> positionsByRound.put(round, StandingsEngine.renumber(rows, scenario)));

        Map<String, Map<Integer, SessionResult>> best = new HashMap<>();
        results.stream()
                .filter(r -> r.session() == Session.RACE && !scenario.excludes(r.driverId()))
                .forEach(r -> best.computeIfAbsent(ConstructorStandingsEngine.teamId(r), id -> new HashMap<>())
                        .merge(r.round(), r, StandingsService::better));

        Map<String, List<String>> out = new HashMap<>();
        best.forEach((teamId, byRound) -> out.put(teamId, races.stream()
                .map(race -> {
                    SessionResult r = byRound.get(race.round());
                    if (r == null) {
                        return "";
                    }
                    Map<Integer, Integer> roundPositions = positionsByRound.get(race.round());
                    Integer position = roundPositions == null ? null : roundPositions.get(r.positionDisplayOrder());
                    return position == null ? r.positionText() : String.valueOf(position);
                })
                .toList()));
        return out;
    }
}
