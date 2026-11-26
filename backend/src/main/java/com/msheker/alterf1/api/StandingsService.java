package com.msheker.alterf1.api;

import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.msheker.alterf1.api.StandingsDtos.Champion;
import com.msheker.alterf1.api.StandingsDtos.DriverRef;
import com.msheker.alterf1.api.StandingsDtos.RaceInfo;
import com.msheker.alterf1.api.StandingsDtos.SeasonSummary;
import com.msheker.alterf1.api.StandingsDtos.StandingLine;
import com.msheker.alterf1.api.StandingsDtos.StandingsResponse;
import com.msheker.alterf1.api.StandingsDtos.SystemInfo;
import com.msheker.alterf1.core.DriverStanding;
import com.msheker.alterf1.core.ScoringSystem;
import com.msheker.alterf1.core.StandingsEngine;
import com.msheker.alterf1.data.RealStanding;
import com.msheker.alterf1.data.SeasonChampion;
import com.msheker.alterf1.data.SeasonResultsRepository;
import com.msheker.alterf1.data.SessionResult;
import com.msheker.alterf1.data.SessionResult.Session;

/** Reads a season (one query) and scores it in memory under the requested system. */
@Service
public class StandingsService {

    private final SeasonResultsRepository repository;
    private final StandingsEngine engine = new StandingsEngine();

    public StandingsService(SeasonResultsRepository repository) {
        this.repository = repository;
    }

    public List<SeasonSummary> seasons() {
        Map<Integer, SeasonChampion> champions = repository.findChampions().stream()
                .collect(Collectors.toMap(SeasonChampion::year, Function.identity()));
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

    public StandingsResponse standings(int year, String systemId, String presetId) {
        ScoringSystem system = parseSystem(systemId);
        Preset preset = Preset.byId(presetId);
        List<SessionResult> results = repository.findBySeason(year);
        if (results.isEmpty()) {
            throw new SeasonNotFoundException(year);
        }

        List<RaceInfo> races = races(results);
        List<DriverStanding> computed = engine.compute(results, system, preset.options());
        Map<String, RealStanding> real = repository.findRealStandings(year).stream()
                .collect(Collectors.toMap(RealStanding::driverId, Function.identity(), (a, b) -> a));
        Map<String, List<String>> resultsByDriver = resultsByDriver(results, races);
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
                            resultsByDriver.getOrDefault(s.driverId(), List.of()));
                })
                .toList();

        DriverStanding top = computed.getFirst();
        Champion champion = new Champion(top.driverId(), top.driverName(), top.points());
        Champion realChampion = repository.findChampion(year)
                .map(c -> new Champion(c.driverId(), c.driverName(), c.points()))
                .orElse(null);
        boolean changed = realChampion != null && !realChampion.driverId().equals(champion.driverId());

        return new StandingsResponse(year, system.id(), ScoringSystem.historicalFor(year).id(), preset.id(),
                races, champion, realChampion, changed, lines);
    }

    private static ScoringSystem parseSystem(String id) {
        try {
            return ScoringSystem.byId(id);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Unknown scoring system '%s'. Use one of: %s.".formatted(id,
                    Arrays.stream(ScoringSystem.values()).map(ScoringSystem::id).collect(Collectors.joining(", "))));
        }
    }

    private static List<RaceInfo> races(List<SessionResult> results) {
        Map<Integer, RaceInfo> byRound = new LinkedHashMap<>();
        results.stream()
                .filter(r -> r.session() == Session.RACE)
                .sorted(Comparator.comparingInt(SessionResult::round))
                .forEach(r -> byRound.putIfAbsent(r.round(),
                        new RaceInfo(r.round(), r.grandPrixId(), r.grandPrixCode(), r.raceDate())));
        return List.copyOf(byRound.values());
    }

    /** Each driver's Grand Prix result per race, in race order; a driver's best car when he had two. */
    private static Map<String, List<String>> resultsByDriver(List<SessionResult> results, List<RaceInfo> races) {
        Map<String, Map<Integer, SessionResult>> best = new HashMap<>();
        results.stream()
                .filter(r -> r.session() == Session.RACE)
                .forEach(r -> best.computeIfAbsent(r.driverId(), id -> new HashMap<>())
                        .merge(r.round(), r, StandingsService::better));
        Map<String, List<String>> out = new HashMap<>();
        best.forEach((driverId, byRound) -> out.put(driverId, races.stream()
                .map(race -> {
                    SessionResult r = byRound.get(race.round());
                    return r == null ? "" : r.positionText();
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
