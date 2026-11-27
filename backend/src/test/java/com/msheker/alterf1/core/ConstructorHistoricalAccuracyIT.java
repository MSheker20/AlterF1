package com.msheker.alterf1.core;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.msheker.alterf1.data.RealConstructorStanding;
import com.msheker.alterf1.data.SeasonResultsRepository;
import com.msheker.alterf1.data.SessionResult;
import com.msheker.alterf1.support.AbstractF1dbIntegrationTest;

/**
 * Historical accuracy test for the constructors' championship: for every season 1958..latest,
 * under its own-era system and default preset, the computed champion must equal the real
 * constructors' champion and every team's points must match F1DB's {@code season_constructor_standing}.
 */
class ConstructorHistoricalAccuracyIT extends AbstractF1dbIntegrationTest {

    private static final BigDecimal TOLERANCE = new BigDecimal("0.01");

    /**
     * Known F1DB constructor-only FIA penalties and mid-season ownership splits that cannot be
     * derived from per-driver {@code race_data.race_points} (where drivers kept their points):
     * <ul>
     *   <li>1995 Brazil GP: Benetton (-10) and Williams (-6) had constructors' points stripped for
     *       fuel irregularities while drivers retained their race points.</li>
     *   <li>2000 Austria GP: McLaren (-10) lost Mika Hakkinen's constructor points for a missing
     *       FIA electronic seal while Hakkinen kept his driver points.</li>
     *   <li>2018 Force India: Sahara Force India went into administration before Belgium (59 pts
     *       wiped as EX) and re-entered as Racing Point Force India (52 pts, P7); F1DB stores both
     *       entries under the same {@code force-india:mercedes} key, producing duplicate rows in
     *       {@code season_constructor_standing}.</li>
     *   <li>2020 Racing Point: FIA deducted 15 constructor points for brake-duct infringement while
     *       drivers kept all race points.</li>
     * </ul>
     */
    private static final Map<String, String> KNOWN_EXCEPTIONS = Map.of(
            "1995:benetton:renault", "1995 Brazil GP fuel penalty: -10 constructor-only points (drivers kept points)",
            "1995:williams:renault", "1995 Brazil GP fuel penalty: -6 constructor-only points (drivers kept points)",
            "2000:mclaren:mercedes", "2000 Austria GP missing FIA seal penalty: -10 constructor-only points",
            "2018:force-india:mercedes", "Mid-season administration split: F1DB shares force-india:mercedes across EX (0) and P7 (52) rows",
            "2020:racing-point:bwt-mercedes", "2020 brake-duct penalty: -15 constructor-only points (drivers kept points)");

    @Autowired
    SeasonResultsRepository repository;

    private final ConstructorStandingsEngine engine = new ConstructorStandingsEngine();

    @Test
    void everySystemReproducesTheRealConstructorsChampionshipsOfItsEra() {
        List<String> mismatches = new ArrayList<>();
        Set<Integer> wrongChampion = new TreeSet<>();
        int seasonsChecked = 0;

        for (int year : repository.findSeasons()) {
            if (ConstructorStandingsEngine.isAlternative(year)) {
                continue;
            }
            List<RealConstructorStanding> real = repository.findRealConstructorStandings(year);
            if (real.isEmpty()) {
                continue;
            }
            seasonsChecked++;
            List<SessionResult> results = repository.findBySeason(year);
            ScoringSystem system = ScoringSystem.historicalFor(year);
            Set<String> excludedTeams = ConstructorStandingsEngine.excludedTeams(real);
            List<ConstructorStanding> computed = engine.compute(results, system, ScoringOptions.HISTORICAL,
                    Scenario.NONE, excludedTeams);

            Map<String, BigDecimal> computedPoints = new LinkedHashMap<>();
            computed.forEach(s -> computedPoints.put(s.teamId(), s.points()));

            for (RealConstructorStanding line : real) {
                String exceptionKey = year + ":" + line.teamId();
                if (KNOWN_EXCEPTIONS.containsKey(exceptionKey)) {
                    continue;
                }
                BigDecimal mine = computedPoints.getOrDefault(line.teamId(), BigDecimal.ZERO);
                if (mine.subtract(line.points()).abs().compareTo(TOLERANCE) > 0) {
                    mismatches.add("%d %s: real %s (%s), computed %s".formatted(
                            year, line.teamId(), line.points(), line.positionText(), mine));
                }
            }
            computed.stream()
                    .filter(s -> s.points().signum() > 0)
                    .filter(s -> real.stream().noneMatch(r -> r.teamId().equals(s.teamId())))
                    .forEach(s -> mismatches.add("%d %s: not in real standings, computed %s"
                            .formatted(year, s.teamId(), s.points())));

            String realChampion = real.stream()
                    .filter(RealConstructorStanding::championshipWon)
                    .findFirst()
                    .map(RealConstructorStanding::teamId)
                    .orElse(real.getFirst().teamId());
            if (!computed.getFirst().teamId().equals(realChampion)) {
                wrongChampion.add(year);
            }
        }

        assertThat(seasonsChecked).as("constructors seasons checked (1958+)").isGreaterThanOrEqualTo(68);
        assertThat(wrongChampion).as("seasons with a wrong constructors' champion").isEmpty();
        assertThat(mismatches).as("constructor points that differ from F1DB").isEmpty();
    }

    @Test
    void everySystemScoresEverySeasonFrom1950WithoutError() {
        for (int year : repository.findSeasons()) {
            List<SessionResult> results = repository.findBySeason(year);
            Set<String> excludedTeams = ConstructorStandingsEngine.isAlternative(year)
                    ? Set.of()
                    : ConstructorStandingsEngine.excludedTeams(repository.findRealConstructorStandings(year));
            for (ScoringSystem system : ScoringSystem.values()) {
                for (ScoringOptions options : List.of(ScoringOptions.HISTORICAL, ScoringOptions.PURE,
                        ScoringOptions.ALL_MULTIPLIERS)) {
                    List<ConstructorStanding> standings = engine.compute(results, system, options,
                            Scenario.NONE, excludedTeams);
                    assertThat(standings).as("%d under %s", year, system.id()).isNotEmpty();
                    assertThat(standings.getFirst().points().signum()).as("%d under %s", year, system.id())
                            .isPositive();
                }
            }
        }
    }
}
