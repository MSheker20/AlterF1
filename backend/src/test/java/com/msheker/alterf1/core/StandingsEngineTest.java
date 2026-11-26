package com.msheker.alterf1.core;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.msheker.alterf1.core.ScoringOptions.DoublePoints;
import com.msheker.alterf1.data.SessionResult;

class StandingsEngineTest {

    private final StandingsEngine engine = new StandingsEngine();

    @Test
    void simpleSeasonUnder1991SystemComputesPointsWinsPodiumsAndOrder() {
        List<SessionResult> season = TestSeasons.season(1995)
                .race(1, "senna", "prost", "hill", "berger")
                .race(2, "prost", "senna", "berger", "hill")
                .race(3, r -> r.order("senna", "hill", "prost").dnf("berger"))
                .build();

        List<DriverStanding> standings = engine.compute(season, ScoringSystem.S1991, ScoringOptions.HISTORICAL);

        assertThat(standings)
                .extracting(
                        DriverStanding::position,
                        DriverStanding::driverId,
                        DriverStanding::points,
                        DriverStanding::grossPoints,
                        DriverStanding::wins,
                        DriverStanding::podiums)
                .containsExactly(
                        tuple(1, "senna", bd("26.00"), bd("26.00"), 2, 3),
                        tuple(2, "prost", bd("20.00"), bd("20.00"), 1, 3),
                        tuple(3, "hill", bd("13.00"), bd("13.00"), 0, 2),
                        tuple(4, "berger", bd("7.00"), bd("7.00"), 0, 1));
    }

    @Test
    void countbackBreaksPointsTieByMoreWins() {
        List<SessionResult> season = TestSeasons.season(1995)
                .race(1, "alice", "bob")
                .race(2, "carol", "bob", "dave", "erin", "alice")
                .build();

        List<DriverStanding> standings = engine.compute(season, ScoringSystem.S1991, ScoringOptions.HISTORICAL);

        assertThat(standings)
                .extracting(DriverStanding::position, DriverStanding::driverId, DriverStanding::points, DriverStanding::wins)
                .startsWith(
                        tuple(1, "alice", bd("12.00"), 1),
                        tuple(2, "bob", bd("12.00"), 0),
                        tuple(3, "carol", bd("10.00"), 1));
    }

    @Test
    void fullTieSharesPosition() {
        List<SessionResult> season = TestSeasons.season(1995)
                .race(1, "alpha", "beta", "gamma")
                .race(2, "beta", "alpha", "gamma")
                .build();

        List<DriverStanding> standings = engine.compute(season, ScoringSystem.S1991, ScoringOptions.HISTORICAL);

        assertThat(standings)
                .extracting(DriverStanding::position, DriverStanding::driverId, DriverStanding::points)
                .containsExactly(
                        tuple(1, "alpha", bd("16.00")),
                        tuple(1, "beta", bd("16.00")),
                        tuple(3, "gamma", bd("8.00")));
    }

    @Test
    void bestNDropsLowestScoresIn1988Season() {
        List<SessionResult> season = twelveRace1988Season();

        List<DriverStanding> standings = engine.compute(season, ScoringSystem.S1961, ScoringOptions.HISTORICAL);

        assertThat(standings)
                .extracting(DriverStanding::driverId, DriverStanding::points, DriverStanding::grossPoints)
                .containsExactly(
                        tuple("a", bd("99.00"), bd("105.00")),
                        tuple("b", bd("69.00"), bd("75.00")));
    }

    @Test
    void same1988SeasonUnderS1991CountsAllResultsWith1991Table() {
        List<SessionResult> season = twelveRace1988Season();

        List<DriverStanding> standings = engine.compute(season, ScoringSystem.S1991, ScoringOptions.HISTORICAL);

        assertThat(standings)
                .extracting(DriverStanding::driverId, DriverStanding::points, DriverStanding::grossPoints)
                .containsExactly(
                        tuple("a", bd("116.00"), bd("116.00")),
                        tuple("b", bd("76.00"), bd("76.00")));
    }

    @Test
    void halfPointsRaceAppliesUnderHistoricalForEverySystemButNotPure() {
        List<SessionResult> season = TestSeasons.season(1995)
                .halfPointsRace(1, "a", "b", "c")
                .build();

        assertThat(engine.compute(season, ScoringSystem.S1991, ScoringOptions.HISTORICAL))
                .extracting(DriverStanding::driverId, DriverStanding::points)
                .containsExactly(tuple("a", bd("5.00")), tuple("b", bd("3.00")), tuple("c", bd("2.00")));

        assertThat(engine.compute(season, ScoringSystem.S2010, ScoringOptions.HISTORICAL))
                .extracting(DriverStanding::driverId, DriverStanding::points)
                .containsExactly(tuple("a", bd("12.50")), tuple("b", bd("9.00")), tuple("c", bd("7.50")));

        assertThat(engine.compute(season, ScoringSystem.S1991, ScoringOptions.PURE))
                .extracting(DriverStanding::driverId, DriverStanding::points)
                .containsExactly(tuple("a", bd("10.00")), tuple("b", bd("6.00")), tuple("c", bd("4.00")));

        assertThat(engine.compute(season, ScoringSystem.S2010, ScoringOptions.PURE))
                .extracting(DriverStanding::driverId, DriverStanding::points)
                .containsExactly(tuple("a", bd("25.00")), tuple("b", bd("18.00")), tuple("c", bd("15.00")));
    }

    @Test
    void doublePointsRaceIn2014RespectsDoublePointsOption() {
        List<SessionResult> season = TestSeasons.season(2014)
                .doublePointsRace(1, "a", "b")
                .build();

        assertThat(engine.compute(season, ScoringSystem.S2010, ScoringOptions.HISTORICAL))
                .extracting(DriverStanding::driverId, DriverStanding::points)
                .containsExactly(tuple("a", bd("50.00")), tuple("b", bd("36.00")));

        assertThat(engine.compute(season, ScoringSystem.S1991, ScoringOptions.HISTORICAL))
                .extracting(DriverStanding::driverId, DriverStanding::points)
                .containsExactly(tuple("a", bd("10.00")), tuple("b", bd("6.00")));

        assertThat(engine.compute(season, ScoringSystem.S1991, ScoringOptions.ALL_MULTIPLIERS))
                .extracting(DriverStanding::driverId, DriverStanding::points)
                .containsExactly(tuple("a", bd("20.00")), tuple("b", bd("12.00")));

        assertThat(engine.compute(season, ScoringSystem.S2010, ScoringOptions.PURE))
                .extracting(DriverStanding::driverId, DriverStanding::points)
                .containsExactly(tuple("a", bd("25.00")), tuple("b", bd("18.00")));

        assertThat(engine.compute(season, ScoringSystem.S1991, ScoringOptions.PURE))
                .extracting(DriverStanding::driverId, DriverStanding::points)
                .containsExactly(tuple("a", bd("10.00")), tuple("b", bd("6.00")));
    }

    @Test
    void sprintPointsAddedPerSystemAndDisabledByOption() {
        List<SessionResult> season = TestSeasons.season(2022)
                .race(1, "a", "b")
                .sprint(1, "a", "b")
                .build();
        ScoringOptions noSprints = new ScoringOptions(true, DoublePoints.OWN_SYSTEM_ONLY, true, false, true);

        assertThat(engine.compute(season, ScoringSystem.S2010, ScoringOptions.HISTORICAL))
                .extracting(DriverStanding::driverId, DriverStanding::points)
                .containsExactly(tuple("a", bd("33.00")), tuple("b", bd("25.00")));

        assertThat(engine.compute(season, ScoringSystem.S1991, ScoringOptions.HISTORICAL))
                .extracting(DriverStanding::driverId, DriverStanding::points)
                .containsExactly(tuple("a", bd("13.00")), tuple("b", bd("8.00")));

        assertThat(engine.compute(season, ScoringSystem.S2010, noSprints))
                .extracting(DriverStanding::driverId, DriverStanding::points)
                .containsExactly(tuple("a", bd("25.00")), tuple("b", bd("18.00")));

        assertThat(engine.compute(season, ScoringSystem.S1991, noSprints))
                .extracting(DriverStanding::driverId, DriverStanding::points)
                .containsExactly(tuple("a", bd("10.00")), tuple("b", bd("6.00")));
    }

    @Test
    void excludingIndy500RemovesItsPointsAndRaceFromBestN() {
        List<SessionResult> season = TestSeasons.season(1955)
                .race(1, "a", "b")
                .race(2, "a", "b")
                .indy500(3, "a", "indy")
                .race(4, "a", "b")
                .race(5, "a", "b")
                .race(6, "b", "a")
                .race(7, "b", "c", "a")
                .build();
        ScoringOptions withoutIndy = new ScoringOptions(true, DoublePoints.OWN_SYSTEM_ONLY, false, true, true);

        // Under S1950 (1955 best 5, 8-6-4-3-2): excluding Indy 500 removes its 8 pts from "a" and removes "indy".
        assertThat(engine.compute(season, ScoringSystem.S1950, ScoringOptions.HISTORICAL))
                .extracting(DriverStanding::driverId, DriverStanding::points, DriverStanding::grossPoints)
                .containsExactly(
                        tuple("a", bd("40.00"), bd("50.00")),
                        tuple("b", bd("34.00"), bd("40.00")),
                        tuple("c", bd("6.00"), bd("6.00")),
                        tuple("indy", bd("6.00"), bd("6.00")));

        assertThat(engine.compute(season, ScoringSystem.S1950, withoutIndy))
                .extracting(DriverStanding::driverId, DriverStanding::points, DriverStanding::grossPoints)
                .containsExactly(
                        tuple("a", bd("38.00"), bd("42.00")),
                        tuple("b", bd("34.00"), bd("40.00")),
                        tuple("c", bd("6.00"), bd("6.00")));

        // Under S1961 (scaled best-N): 7 races -> best 5; excluding Indy 500 leaves 6 races -> best 4.
        assertThat(engine.compute(season, ScoringSystem.S1961, ScoringOptions.HISTORICAL))
                .filteredOn(s -> s.driverId().equals("b"))
                .extracting(DriverStanding::points, DriverStanding::grossPoints)
                .containsExactly(tuple(bd("36.00"), bd("42.00")));

        assertThat(engine.compute(season, ScoringSystem.S1961, withoutIndy))
                .filteredOn(s -> s.driverId().equals("b"))
                .extracting(DriverStanding::points, DriverStanding::grossPoints)
                .containsExactly(tuple(bd("30.00"), bd("42.00")));
    }

    @Test
    void fastestLapOutsideTheRealTopTenStillScoresUnderASystemWithoutThatCondition() {
        // 2021 rule: the fastest-lap point only for a top-10 finisher, so "k" (P11) really got 0.
        List<SessionResult> season = TestSeasons.season(2021)
                .race(1, s -> s.order("a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k").fastestLap("k"))
                .build();

        assertThat(engine.compute(season, ScoringSystem.S2010, ScoringOptions.HISTORICAL))
                .filteredOn(st -> st.driverId().equals("k"))
                .extracting(DriverStanding::points)
                .containsExactly(bd("0.00"));
        // The 1950 system rewards any fastest lap.
        assertThat(engine.compute(season, ScoringSystem.S1950, ScoringOptions.HISTORICAL))
                .filteredOn(st -> st.driverId().equals("k"))
                .extracting(DriverStanding::points)
                .containsExactly(bd("1.00"));
    }

    @Test
    void emptyInputReturnsEmptyList() {
        assertThat(engine.compute(List.of(), ScoringSystem.S2010, ScoringOptions.HISTORICAL)).isEmpty();
        assertThat(engine.compute(List.of(), ScoringSystem.S2010.rulesFor(2024, 24), ScoringOptions.HISTORICAL))
                .isEmpty();
    }

    private static List<SessionResult> twelveRace1988Season() {
        TestSeasons builder = TestSeasons.season(1988);
        for (int round = 1; round <= 11; round++) {
            builder.race(round, "a", "b");
        }
        builder.race(12, "b", "a");
        return builder.build();
    }

    private static BigDecimal bd(String value) {
        return new BigDecimal(value);
    }
}
