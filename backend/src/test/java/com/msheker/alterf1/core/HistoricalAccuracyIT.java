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

import com.msheker.alterf1.data.RealStanding;
import com.msheker.alterf1.data.SeasonResultsRepository;
import com.msheker.alterf1.data.SessionResult;
import com.msheker.alterf1.support.AbstractF1dbIntegrationTest;

/**
 * The strongest test of data and engine (PLAN.md §3): every system, applied to the seasons
 * of its own era, must reproduce the real championship, driver by driver.
 */
class HistoricalAccuracyIT extends AbstractF1dbIntegrationTest {

    private static final BigDecimal TOLERANCE = new BigDecimal("0.01");

    @Autowired
    SeasonResultsRepository repository;

    private final StandingsEngine engine = new StandingsEngine();

    @Test
    void everySystemReproducesTheRealChampionshipsOfItsEra() {
        List<String> mismatches = new ArrayList<>();
        Set<Integer> wrongChampion = new TreeSet<>();

        for (int year : repository.findSeasons()) {
            List<RealStanding> real = repository.findRealStandings(year);
            if (real.isEmpty()) {
                continue; // season without a final standing yet
            }
            List<SessionResult> results = repository.findBySeason(year);
            ScoringSystem system = ScoringSystem.historicalFor(year);
            List<DriverStanding> computed = engine.compute(results, system, ScoringOptions.HISTORICAL);

            Map<String, BigDecimal> computedPoints = new LinkedHashMap<>();
            computed.forEach(s -> computedPoints.put(s.driverId(), s.points()));

            for (RealStanding line : real) {
                BigDecimal mine = computedPoints.getOrDefault(line.driverId(), BigDecimal.ZERO);
                if (mine.subtract(line.points()).abs().compareTo(TOLERANCE) > 0) {
                    mismatches.add("%d %s: real %s (%s), computed %s".formatted(
                            year, line.driverId(), line.points(), line.positionText(), mine));
                }
            }
            computed.stream()
                    .filter(s -> s.points().signum() > 0)
                    .filter(s -> real.stream().noneMatch(r -> r.driverId().equals(s.driverId())))
                    .forEach(s -> mismatches.add("%d %s: not in real standings, computed %s"
                            .formatted(year, s.driverId(), s.points())));

            String realChampion = real.getFirst().driverId();
            if (!computed.getFirst().driverId().equals(realChampion)) {
                wrongChampion.add(year);
            }
        }

        System.out.println("=== Historical accuracy: " + mismatches.size() + " mismatches, wrong champion in "
                + wrongChampion + " ===");
        mismatches.forEach(System.out::println);

        assertThat(wrongChampion).as("seasons with a wrong champion").isEmpty();
        assertThat(mismatches).as("driver points that differ from the real standings").isEmpty();
    }

    @Test
    void season1988UnderThe1991RulesMakesProstChampion() {
        List<DriverStanding> standings = engine.compute(repository.findBySeason(1988), ScoringSystem.S1991,
                ScoringOptions.HISTORICAL);

        assertThat(standings.get(0)).extracting(DriverStanding::driverId, DriverStanding::points)
                .containsExactly("alain-prost", new BigDecimal("112.00"));
        assertThat(standings.get(1)).extracting(DriverStanding::driverId, DriverStanding::points)
                .containsExactly("ayrton-senna", new BigDecimal("102.00"));
    }

    @Test
    void everySystemScoresEverySeasonWithoutError() {
        for (int year : repository.findSeasons()) {
            List<SessionResult> results = repository.findBySeason(year);
            for (ScoringSystem system : ScoringSystem.values()) {
                for (ScoringOptions options : List.of(ScoringOptions.HISTORICAL, ScoringOptions.PURE,
                        ScoringOptions.ALL_MULTIPLIERS)) {
                    List<DriverStanding> standings = engine.compute(results, system, options);
                    assertThat(standings).as("%d under %s", year, system.id()).isNotEmpty();
                    assertThat(standings.getFirst().points().signum()).as("%d under %s", year, system.id())
                            .isPositive();
                }
            }
        }
    }
}
