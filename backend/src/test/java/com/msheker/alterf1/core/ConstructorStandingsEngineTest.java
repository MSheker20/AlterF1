package com.msheker.alterf1.core;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.Test;

import com.msheker.alterf1.core.ScoringOptions.DoublePoints;
import com.msheker.alterf1.data.SessionResult;

class ConstructorStandingsEngineTest {

    private final ConstructorStandingsEngine engine = new ConstructorStandingsEngine();

    @Test
    void bestCarOnlyIn1970ScoresOnlyHighestCarWithoutPromotingRivals() {
        // 1970 (9-6-4-3-2-1, bestCarOnly=true): Ferrari finishes P1 & P2, Lotus P3.
        // Ferrari scores 9 (not 15), and Lotus still scores P3's 4 (not P2's 6).
        List<SessionResult> season = TestSeasons.season(1970)
                .race(1, r -> r
                        .finish("ickx", e -> e.team("ferrari", "Ferrari", "ferrari", "Ferrari"))
                        .finish("regazzoni", e -> e.team("ferrari", "Ferrari", "ferrari", "Ferrari"))
                        .finish("rindt", e -> e.team("lotus", "Lotus", "ford", "Ford")))
                .build();

        List<ConstructorStanding> standings = engine.compute(season, ScoringSystem.S1961, ScoringOptions.HISTORICAL);

        assertThat(standings)
                .extracting(ConstructorStanding::position, ConstructorStanding::teamId,
                        ConstructorStanding::name, ConstructorStanding::points,
                        ConstructorStanding::wins, ConstructorStanding::podiums)
                .containsExactly(
                        tuple(1, "ferrari:ferrari", "Ferrari", bd("9.00"), 1, 1),
                        tuple(2, "lotus:ford", "Lotus Ford", bd("4.00"), 0, 1));
    }

    @Test
    void allCarsScoreFrom1979Onwards() {
        // 1979 (9-6-4-3-2-1, bestCarOnly=false): Ferrari P1 & P2 -> 15 points, 2 podiums.
        List<SessionResult> season = TestSeasons.season(1979)
                .race(1, r -> r
                        .finish("scheckter", e -> e.team("ferrari", "Ferrari", "ferrari", "Ferrari"))
                        .finish("villeneuve", e -> e.team("ferrari", "Ferrari", "ferrari", "Ferrari"))
                        .finish("jones", e -> e.team("williams", "Williams", "ford", "Ford")))
                .build();

        List<ConstructorStanding> standings = engine.compute(season, ScoringSystem.S1961, ScoringOptions.HISTORICAL);

        assertThat(standings)
                .extracting(ConstructorStanding::teamId, ConstructorStanding::points,
                        ConstructorStanding::wins, ConstructorStanding::podiums)
                .containsExactly(
                        tuple("ferrari:ferrari", bd("15.00"), 1, 2),
                        tuple("williams:ford", bd("4.00"), 0, 1));
    }

    @Test
    void separatesTeamsByChassisPlusEngineAndFormatsDisplayNames() {
        List<SessionResult> season = TestSeasons.season(1960)
                .race(1, r -> r
                        .finish("brabham", e -> e.team("cooper", "Cooper", "climax", "Climax"))
                        .finish("gregory", e -> e.team("cooper", "Cooper", "maserati", "Maserati"))
                        .finish("hill", e -> e.team("ferrari", "Ferrari", "ferrari", "Ferrari")))
                .build();

        List<ConstructorStanding> standings = engine.compute(season, ScoringSystem.S1950, ScoringOptions.HISTORICAL);

        assertThat(standings)
                .extracting(ConstructorStanding::teamId, ConstructorStanding::name, ConstructorStanding::points)
                .containsExactly(
                        tuple("cooper:climax", "Cooper Climax", bd("8.00")),
                        tuple("cooper:maserati", "Cooper Maserati", bd("6.00")),
                        tuple("ferrari:ferrari", "Ferrari", bd("4.00")));
    }

    @Test
    void season1961UsesConstructors8PointWinTable() {
        List<SessionResult> season = TestSeasons.season(1961)
                .race(1, r -> r
                        .finish("hill", e -> e.team("ferrari", "Ferrari", "ferrari", "Ferrari"))
                        .finish("moss", e -> e.team("lotus", "Lotus", "climax", "Climax")))
                .build();

        List<ConstructorStanding> standings = engine.compute(season, ScoringSystem.S1961, ScoringOptions.HISTORICAL);

        assertThat(standings)
                .extracting(ConstructorStanding::teamId, ConstructorStanding::points)
                .containsExactly(
                        tuple("ferrari:ferrari", bd("8.00")),
                        tuple("lotus:climax", bd("6.00")));
    }

    @Test
    void indy500AndFiftiesFastestLapNeverCountForConstructors() {
        List<SessionResult> season = TestSeasons.season(1958)
                .race(1, r -> r
                        .finish("moss", e -> e.team("cooper", "Cooper", "climax", "Climax").fastestLap())
                        .finish("musso", e -> e.team("ferrari", "Ferrari", "ferrari", "Ferrari")))
                .indy500(2, "bryan", "amick")
                .build();

        List<ConstructorStanding> standings = engine.compute(season, ScoringSystem.S1950, ScoringOptions.HISTORICAL);

        assertThat(standings)
                .extracting(ConstructorStanding::teamId, ConstructorStanding::points)
                .containsExactly(
                        tuple("cooper:climax", bd("8.00")), // FL bonus not counted for 1958 constructors
                        tuple("ferrari:ferrari", bd("6.00")));
    }

    @Test
    void bestNDropsLowestRaceScoresInBestCarEra() {
        // 1959 constructors: best 5 of 8 non-Indy races.
        TestSeasons builder = TestSeasons.season(1959);
        for (int round = 1; round <= 6; round++) {
            final int r = round;
            builder.race(round, s -> {
                if (r <= 5) {
                    s.finish("brabham", e -> e.team("cooper", "Cooper", "climax", "Climax"))
                            .finish("brooks", e -> e.team("ferrari", "Ferrari", "ferrari", "Ferrari"));
                } else {
                    s.finish("brooks", e -> e.team("ferrari", "Ferrari", "ferrari", "Ferrari"))
                            .finish("brabham", e -> e.team("cooper", "Cooper", "climax", "Climax"));
                }
            });
        }

        List<ConstructorStanding> standings = engine.compute(builder.build(), ScoringSystem.S1950,
                ScoringOptions.HISTORICAL);

        // Cooper: five wins (40) + one P2 (6, dropped) -> 40 counted, 46 gross.
        // Ferrari: one win (8) + five P2s (30) -> best 5 = 8 + 24 = 32 counted, 38 gross.
        assertThat(standings)
                .extracting(ConstructorStanding::teamId, ConstructorStanding::points, ConstructorStanding::grossPoints)
                .containsExactly(
                        tuple("cooper:climax", bd("40.00"), bd("46.00")),
                        tuple("ferrari:ferrari", bd("32.00"), bd("38.00")));
    }

    @Test
    void excludedTeamGetsZeroWithoutPromotingOtherTeamsAndNotesIneligible() {
        List<SessionResult> season = TestSeasons.season(2007)
                .race(1, r -> r
                        .finish("hamilton", e -> e.team("mclaren", "McLaren", "mercedes", "Mercedes"))
                        .finish("raikkonen", e -> e.team("ferrari", "Ferrari", "ferrari", "Ferrari")))
                .build();

        Set<String> excludedTeams = Set.of("mclaren:mercedes");
        List<ConstructorStanding> standings = engine.compute(season, ScoringSystem.S2003,
                ScoringOptions.HISTORICAL, Scenario.NONE, excludedTeams);

        assertThat(standings)
                .extracting(ConstructorStanding::teamId, ConstructorStanding::points, ConstructorStanding::wins)
                .containsExactly(
                        tuple("ferrari:ferrari", bd("8.00"), 0),
                        tuple("mclaren:mercedes", bd("0.00"), 0));
        assertThat(engine.notes(season, ScoringSystem.S2003, ScoringOptions.HISTORICAL, Scenario.NONE, excludedTeams))
                .contains(SeasonNote.INELIGIBLE);
    }

    @Test
    void sprintsScoreAllCarsAndRespectSprintsSwitch() {
        List<SessionResult> season = TestSeasons.season(2022)
                .race(1, r -> r
                        .finish("ver", e -> e.team("red-bull", "Red Bull", "rbpt", "RBPT"))
                        .finish("per", e -> e.team("red-bull", "Red Bull", "rbpt", "RBPT"))
                        .finish("lec", e -> e.team("ferrari", "Ferrari", "ferrari", "Ferrari")))
                .sprint(1, r -> r
                        .finish("ver", e -> e.team("red-bull", "Red Bull", "rbpt", "RBPT"))
                        .finish("per", e -> e.team("red-bull", "Red Bull", "rbpt", "RBPT"))
                        .finish("lec", e -> e.team("ferrari", "Ferrari", "ferrari", "Ferrari")))
                .build();
        ScoringOptions noSprints = new ScoringOptions(true, DoublePoints.OWN_SYSTEM_ONLY, true, false, true);

        // Race: RB = 25+18 = 43, Ferrari = 15. Sprint: RB = 8+7 = 15, Ferrari = 6.
        assertThat(engine.compute(season, ScoringSystem.S2010, ScoringOptions.HISTORICAL))
                .extracting(ConstructorStanding::teamId, ConstructorStanding::points)
                .containsExactly(
                        tuple("red-bull:rbpt", bd("58.00")),
                        tuple("ferrari:ferrari", bd("21.00")));

        assertThat(engine.compute(season, ScoringSystem.S2010, noSprints))
                .extracting(ConstructorStanding::teamId, ConstructorStanding::points)
                .containsExactly(
                        tuple("red-bull:rbpt", bd("43.00")),
                        tuple("ferrari:ferrari", bd("15.00")));
    }

    @Test
    void scenarioExcludesDriverSkipsRoundAndTransfersFastestLap() {
        List<SessionResult> season = TestSeasons.season(2023)
                .race(1, r -> r
                        .finish("ver", e -> e.team("red-bull", "Red Bull", "honda-rbpt", "Honda RBPT").fastestLap())
                        .finish("per", e -> e.team("red-bull", "Red Bull", "honda-rbpt", "Honda RBPT"))
                        .finish("alo", e -> e.team("aston-martin", "Aston Martin", "mercedes", "Mercedes")))
                .race(2, r -> r
                        .finish("alo", e -> e.team("aston-martin", "Aston Martin", "mercedes", "Mercedes"))
                        .finish("per", e -> e.team("red-bull", "Red Bull", "honda-rbpt", "Honda RBPT")))
                .build();

        // Remove ver (FL passes to alo) and skip round 2.
        Scenario scenario = new Scenario(Set.of("ver"), Set.of(2), Map.of(1, List.of("ver", "alo", "per")));
        List<ConstructorStanding> standings = engine.compute(season, ScoringSystem.S2010,
                ScoringOptions.HISTORICAL, scenario, Set.of());

        // Round 1 after removing ver: per P1 (25), alo P2 (18 + 1 FL = 19).
        assertThat(standings)
                .extracting(ConstructorStanding::teamId, ConstructorStanding::points, ConstructorStanding::wins)
                .containsExactly(
                        tuple("red-bull:honda-rbpt", bd("25.00"), 1),
                        tuple("aston-martin:mercedes", bd("19.00"), 0));
    }

    @Test
    void countbackBreaksTiesAndExactTiesSharePosition() {
        List<SessionResult> season = TestSeasons.season(1995)
                .race(1, r -> r
                        .finish("a1", e -> e.team("alpha", "Alpha", "m1", "M1"))
                        .finish("b1", e -> e.team("beta", "Beta", "m2", "M2")))
                .race(2, r -> r
                        .finish("c1", e -> e.team("gamma", "Gamma", "m3", "M3"))
                        .finish("b1", e -> e.team("beta", "Beta", "m2", "M2"))
                        .finish("d1", e -> e.team("delta", "Delta", "m4", "M4"))
                        .finish("e1", e -> e.team("epsilon", "Epsilon", "m5", "M5"))
                        .finish("a1", e -> e.team("alpha", "Alpha", "m1", "M1")))
                .build();

        List<ConstructorStanding> standings = engine.compute(season, ScoringSystem.S1991, ScoringOptions.HISTORICAL);

        assertThat(standings)
                .extracting(ConstructorStanding::position, ConstructorStanding::teamId,
                        ConstructorStanding::points, ConstructorStanding::wins)
                .startsWith(
                        tuple(1, "alpha:m1", bd("12.00"), 1),
                        tuple(2, "beta:m2", bd("12.00"), 0));

        // Exact tie shares position 1.
        List<SessionResult> tied = TestSeasons.season(1995)
                .race(1, r -> r
                        .finish("a1", e -> e.team("alpha", "Alpha", "m1", "M1"))
                        .finish("b1", e -> e.team("beta", "Beta", "m2", "M2")))
                .race(2, r -> r
                        .finish("b1", e -> e.team("beta", "Beta", "m2", "M2"))
                        .finish("a1", e -> e.team("alpha", "Alpha", "m1", "M1")))
                .build();
        assertThat(engine.compute(tied, ScoringSystem.S1991, ScoringOptions.HISTORICAL))
                .extracting(ConstructorStanding::position, ConstructorStanding::teamId)
                .containsExactly(tuple(1, "alpha:m1"), tuple(1, "beta:m2"));
    }

    @Test
    void progressionClinchAccountsForTwoCarsPerTeamAndIgnoresExcludedRivals() {
        // 1995 (10-6-4-3-2-1, all cars score): two-car teams -> max 16 per race.
        // Round 1-3: Alpha 1-2 (16 each = 48), Beta 3-4 (7 each = 21).
        // After round 3 (1 race left): Beta max = 21 + 16 = 37 < 48 -> clinch at round 3!
        // After round 2 (2 races left): Beta max = 14 + 32 = 46 > 32 -> not clinched at round 2.
        TestSeasons builder = TestSeasons.season(1995);
        for (int round = 1; round <= 4; round++) {
            builder.race(round, r -> r
                    .finish("a1", e -> e.team("alpha", "Alpha", "m1", "M1"))
                    .finish("a2", e -> e.team("alpha", "Alpha", "m1", "M1"))
                    .finish("b1", e -> e.team("beta", "Beta", "m2", "M2"))
                    .finish("b2", e -> e.team("beta", "Beta", "m2", "M2")));
        }

        ConstructorStandingsEngine.Progression progression = engine.progression(builder.build(),
                ScoringSystem.S1991, ScoringOptions.HISTORICAL, Scenario.NONE, Set.of());

        assertThat(progression.totals().get("alpha:m1"))
                .containsExactly(bd("16.00"), bd("32.00"), bd("48.00"), bd("64.00"));
        assertThat(progression.clinch()).isEqualTo(new ConstructorStandingsEngine.Clinch(3, "alpha:m1"));
    }

    @Test
    void customSystemScoresAllCarsAndRespectsCustomBestResults() {
        List<SessionResult> season = TestSeasons.season(1995)
                .race(1, r -> r
                        .finish("a1", e -> e.team("alpha", "Alpha", "m1", "M1"))
                        .finish("a2", e -> e.team("alpha", "Alpha", "m1", "M1"))
                        .finish("b1", e -> e.team("beta", "Beta", "m2", "M2")))
                .race(2, r -> r
                        .finish("a1", e -> e.team("alpha", "Alpha", "m1", "M1"))
                        .finish("b1", e -> e.team("beta", "Beta", "m2", "M2")))
                .race(3, r -> r
                        .finish("b1", e -> e.team("beta", "Beta", "m2", "M2"))
                        .finish("a1", e -> e.team("alpha", "Alpha", "m1", "M1")))
                .build();
        CustomSystem custom = new CustomSystem(ScoringRules.points(5, 2, 1), false, CustomSystem.Sprint.NONE, 2);

        List<ConstructorStanding> standings = engine.compute(season, custom.rules(), custom.constructorRules(),
                ScoringOptions.HISTORICAL, Scenario.NONE, Set.of());

        // Alpha race scores: R1=7, R2=5, R3=2 -> best 2 = 12, gross = 14.
        // Beta race scores: R1=1, R2=2, R3=5 -> best 2 = 7, gross = 8.
        assertThat(standings)
                .extracting(ConstructorStanding::teamId, ConstructorStanding::points, ConstructorStanding::grossPoints)
                .containsExactly(
                        tuple("alpha:m1", bd("12.00"), bd("14.00")),
                        tuple("beta:m2", bd("7.00"), bd("8.00")));
    }

    @Test
    void bestCarOnlyScoresOnlyHighestCarInSprintsAndClinchUsesOneSprintCar() {
        // Under 1950 rules on a 2022 sprint weekend (bestCarOnly=true, race 8-6-4-3-2, sprint 3-2-1):
        // A 2-car team finishing 1-2 in both race and sprint gets only P1 race (8) + P1 sprint (3) = 11.
        List<SessionResult> oneWeekend = TestSeasons.season(2022)
                .race(1, r -> r
                        .finish("ver", e -> e.team("red-bull", "Red Bull", "rbpt", "RBPT"))
                        .finish("per", e -> e.team("red-bull", "Red Bull", "rbpt", "RBPT"))
                        .finish("lec", e -> e.team("ferrari", "Ferrari", "ferrari", "Ferrari")))
                .sprint(1, r -> r
                        .finish("ver", e -> e.team("red-bull", "Red Bull", "rbpt", "RBPT"))
                        .finish("per", e -> e.team("red-bull", "Red Bull", "rbpt", "RBPT"))
                        .finish("lec", e -> e.team("ferrari", "Ferrari", "ferrari", "Ferrari")))
                .build();

        assertThat(engine.compute(oneWeekend, ScoringSystem.S1950, ScoringOptions.HISTORICAL))
                .extracting(ConstructorStanding::teamId, ConstructorStanding::points)
                .containsExactly(
                        tuple("red-bull:rbpt", bd("11.00")),
                        tuple("ferrari:ferrari", bd("5.00")));

        // Clinch with bestCarOnly=true and a remaining sprint round:
        // Race 8-6-4-3-2, sprint 3-2-1, all results count -> max 11 per weekend (8 + 3), NOT 13 (8 + 3 + 2).
        // After round 2: Alpha = 22 (11 + 11), Beta = 10 (5 + 5); gap is 12 > 11 -> clinch at round 2.
        TestSeasons threeWeekends = TestSeasons.season(2022);
        for (int round = 1; round <= 3; round++) {
            final boolean alphaWins = round <= 2;
            threeWeekends.race(round, r -> {
                if (alphaWins) {
                    r.finish("a1", e -> e.team("alpha", "Alpha", "m1", "M1"))
                            .finish("a2", e -> e.team("alpha", "Alpha", "m1", "M1"))
                            .finish("b1", e -> e.team("beta", "Beta", "m2", "M2"))
                            .finish("b2", e -> e.team("beta", "Beta", "m2", "M2"));
                } else {
                    r.finish("b1", e -> e.team("beta", "Beta", "m2", "M2"))
                            .finish("b2", e -> e.team("beta", "Beta", "m2", "M2"))
                            .finish("a1", e -> e.team("alpha", "Alpha", "m1", "M1"))
                            .finish("a2", e -> e.team("alpha", "Alpha", "m1", "M1"));
                }
            }).sprint(round, r -> {
                if (alphaWins) {
                    r.finish("a1", e -> e.team("alpha", "Alpha", "m1", "M1"))
                            .finish("a2", e -> e.team("alpha", "Alpha", "m1", "M1"))
                            .finish("b1", e -> e.team("beta", "Beta", "m2", "M2"))
                            .finish("b2", e -> e.team("beta", "Beta", "m2", "M2"));
                } else {
                    r.finish("b1", e -> e.team("beta", "Beta", "m2", "M2"))
                            .finish("b2", e -> e.team("beta", "Beta", "m2", "M2"))
                            .finish("a1", e -> e.team("alpha", "Alpha", "m1", "M1"))
                            .finish("a2", e -> e.team("alpha", "Alpha", "m1", "M1"));
                }
            });
        }

        ScoringRules rules = new ScoringRules(ScoringRules.points(8, 6, 4, 3, 2), ScoringRules.points(3, 2, 1),
                null, BestResults.ALL, SharedDriveRule.NO_POINTS);
        ConstructorRules bestCarRules = new ConstructorRules(true, BestResults.ALL, false);
        ConstructorStandingsEngine.Progression progression = engine.progression(threeWeekends.build(),
                rules, bestCarRules, ScoringOptions.HISTORICAL, Scenario.NONE, Set.of());

        assertThat(progression.totals().get("alpha:m1"))
                .containsExactly(bd("11.00"), bd("22.00"), bd("27.00"));
        assertThat(progression.clinch()).isEqualTo(new ConstructorStandingsEngine.Clinch(2, "alpha:m1"));
    }

    @Test
    void sharedUnclassifiedCarIsNotCountedTwiceForClinchCarLimit() {
        // 1995 rules (10-6-4-3-2-1, all cars score): Beta runs only 1 car, shared by two drivers who DNF in R1.
        // Round 1: Alpha P1 (10), Beta shared DNF (0). Round 2: Alpha P1 (20), Beta P2 (6). Round 3: Alpha P1, Beta P2.
        // If Beta's shared DNF is counted as 1 car: R3 max = 10 -> 6 + 10 = 16 < 20 -> Alpha clinches at round 2.
        // If miscounted as 2 cars: R3 max = 16 -> 6 + 16 = 22 > 20 -> would fail to clinch at round 2.
        List<SessionResult> season = TestSeasons.season(1995)
                .race(1, r -> r
                        .finish("a1", e -> e.team("alpha", "Alpha", "m1", "M1"))
                        .dnf("b1", e -> e.team("beta", "Beta", "m2", "M2"))
                        .dnf("b2", e -> e.team("beta", "Beta", "m2", "M2").sharedCar()))
                .race(2, r -> r
                        .finish("a1", e -> e.team("alpha", "Alpha", "m1", "M1"))
                        .finish("b1", e -> e.team("beta", "Beta", "m2", "M2")))
                .race(3, r -> r
                        .finish("a1", e -> e.team("alpha", "Alpha", "m1", "M1"))
                        .finish("b1", e -> e.team("beta", "Beta", "m2", "M2")))
                .build();

        ConstructorStandingsEngine.Progression progression = engine.progression(season,
                ScoringSystem.S1991, ScoringOptions.HISTORICAL, Scenario.NONE, Set.of());

        assertThat(progression.clinch()).isEqualTo(new ConstructorStandingsEngine.Clinch(2, "alpha:m1"));
    }

    private static BigDecimal bd(String value) {
        return new BigDecimal(value);
    }
}
