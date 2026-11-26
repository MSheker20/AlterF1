package com.msheker.alterf1.core;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;

import com.msheker.alterf1.core.BestResults.Halves;
import com.msheker.alterf1.core.BestResults.Season;

class ScoringSystemTest {

    @Test
    void eachSystemCoversExactlyItsEra() {
        assertThat(ScoringSystem.S1950.covers(1949)).isFalse();
        assertThat(ScoringSystem.S1950.covers(1950)).isTrue();
        assertThat(ScoringSystem.S1950.covers(1960)).isTrue();
        assertThat(ScoringSystem.S1950.covers(1961)).isFalse();

        assertThat(ScoringSystem.S1961.covers(1960)).isFalse();
        assertThat(ScoringSystem.S1961.covers(1961)).isTrue();
        assertThat(ScoringSystem.S1961.covers(1990)).isTrue();
        assertThat(ScoringSystem.S1961.covers(1991)).isFalse();

        assertThat(ScoringSystem.S1991.covers(1990)).isFalse();
        assertThat(ScoringSystem.S1991.covers(1991)).isTrue();
        assertThat(ScoringSystem.S1991.covers(2002)).isTrue();
        assertThat(ScoringSystem.S1991.covers(2003)).isFalse();

        assertThat(ScoringSystem.S2003.covers(2002)).isFalse();
        assertThat(ScoringSystem.S2003.covers(2003)).isTrue();
        assertThat(ScoringSystem.S2003.covers(2009)).isTrue();
        assertThat(ScoringSystem.S2003.covers(2010)).isFalse();

        assertThat(ScoringSystem.S2010.covers(2009)).isFalse();
        assertThat(ScoringSystem.S2010.covers(2010)).isTrue();
        assertThat(ScoringSystem.S2010.covers(2026)).isTrue();

        assertThat(ScoringSystem.historicalFor(1960)).isEqualTo(ScoringSystem.S1950);
        assertThat(ScoringSystem.historicalFor(1961)).isEqualTo(ScoringSystem.S1961);
        assertThat(ScoringSystem.historicalFor(1990)).isEqualTo(ScoringSystem.S1961);
        assertThat(ScoringSystem.historicalFor(1991)).isEqualTo(ScoringSystem.S1991);
        assertThat(ScoringSystem.historicalFor(2002)).isEqualTo(ScoringSystem.S1991);
        assertThat(ScoringSystem.historicalFor(2003)).isEqualTo(ScoringSystem.S2003);
        assertThat(ScoringSystem.historicalFor(2009)).isEqualTo(ScoringSystem.S2003);
        assertThat(ScoringSystem.historicalFor(2010)).isEqualTo(ScoringSystem.S2010);
    }

    @Test
    void lookupByIdAndInvalidInputs() {
        assertThat(ScoringSystem.byId("1950")).isEqualTo(ScoringSystem.S1950);
        assertThat(ScoringSystem.byId("1961")).isEqualTo(ScoringSystem.S1961);
        assertThat(ScoringSystem.byId("1991")).isEqualTo(ScoringSystem.S1991);
        assertThat(ScoringSystem.byId("2003")).isEqualTo(ScoringSystem.S2003);
        assertThat(ScoringSystem.byId("2010")).isEqualTo(ScoringSystem.S2010);

        assertThatIllegalArgumentException().isThrownBy(() -> ScoringSystem.byId("unknown"));
        assertThatIllegalArgumentException().isThrownBy(() -> ScoringSystem.historicalFor(1949));
    }

    @Test
    void s1961BestResultsInEraAndProportionallyScaledOutsideEra() {
        assertThat(ScoringSystem.S1961.rulesFor(1988, 16).bestResults()).isEqualTo(new Season(11));
        assertThat(ScoringSystem.S1961.rulesFor(1975, 14).bestResults()).isEqualTo(new Halves(7, 6, 6));
        assertThat(ScoringSystem.S1961.rulesFor(2022, 22).bestResults()).isEqualTo(new Season(15));
        assertThat(ScoringSystem.S1961.rulesFor(1955, 8).bestResults()).isEqualTo(new Season(6));
    }

    @Test
    void s1950HistoricalBestNSharedDrivesFastestLapAnd1960Table() {
        ScoringRules r1950 = ScoringSystem.S1950.rulesFor(1950, 7);
        ScoringRules r1954 = ScoringSystem.S1950.rulesFor(1954, 9);
        ScoringRules r1957 = ScoringSystem.S1950.rulesFor(1957, 8);
        ScoringRules r1958 = ScoringSystem.S1950.rulesFor(1958, 11);
        ScoringRules r1959 = ScoringSystem.S1950.rulesFor(1959, 9);
        ScoringRules r1960 = ScoringSystem.S1950.rulesFor(1960, 10);

        assertThat(r1950.bestResults()).isEqualTo(new Season(4));
        assertThat(r1954.bestResults()).isEqualTo(new Season(5));
        assertThat(r1958.bestResults()).isEqualTo(new Season(6));
        assertThat(r1959.bestResults()).isEqualTo(new Season(5));

        assertThat(r1950.sharedDrive()).isEqualTo(SharedDriveRule.SPLIT);
        assertThat(r1957.sharedDrive()).isEqualTo(SharedDriveRule.SPLIT);
        assertThat(r1958.sharedDrive()).isEqualTo(SharedDriveRule.NO_POINTS);
        assertThat(r1960.sharedDrive()).isEqualTo(SharedDriveRule.NO_POINTS);

        assertThat(r1950.fastestLap()).isEqualTo(FastestLapRule.FIFTIES);
        assertThat(r1959.fastestLap()).isEqualTo(FastestLapRule.FIFTIES);
        assertThat(r1960.fastestLap()).isNull();

        assertThat(r1959.racePoints()).containsExactlyElementsOf(ScoringRules.points(8, 6, 4, 3, 2));
        assertThat(r1960.racePoints()).containsExactlyElementsOf(ScoringRules.points(8, 6, 4, 3, 2, 1));
    }

    @Test
    void olderSystemsUseTheClassic321SprintTable() {
        for (ScoringSystem system : java.util.List.of(ScoringSystem.S1950, ScoringSystem.S1961, ScoringSystem.S1991,
                ScoringSystem.S2003)) {
            assertThat(system.rulesFor(2022, 22).sprintPoints()).as(system.id())
                    .containsExactlyElementsOf(ScoringRules.points(3, 2, 1));
        }
    }

    @Test
    void s2010FastestLapWindowAndSprintTables() {
        assertThat(ScoringSystem.S2010.rulesFor(2018, 21).fastestLap()).isNull();
        for (int year = 2019; year <= 2024; year++) {
            assertThat(ScoringSystem.S2010.rulesFor(year, 22).fastestLap())
                    .as("fastest lap rule for %d", year)
                    .isEqualTo(FastestLapRule.TOP_TEN);
        }
        assertThat(ScoringSystem.S2010.rulesFor(2025, 24).fastestLap()).isNull();

        assertThat(ScoringSystem.S2010.rulesFor(2021, 22).sprintPoints())
                .containsExactlyElementsOf(ScoringRules.points(3, 2, 1));
        assertThat(ScoringSystem.S2010.rulesFor(2022, 22).sprintPoints())
                .containsExactlyElementsOf(ScoringRules.points(8, 7, 6, 5, 4, 3, 2, 1));
    }
}
