package com.msheker.alterf1.og;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/** Same colours as the frontend's teamColor() (values computed with frontend/src/lib/teamColors.ts). */
class TeamColorsTest {

    private final TeamColors colors = TeamColors.load();

    @Test
    void knownTeamsUseTheSharedTable() {
        assertThat(colors.hex("mclaren")).isEqualTo("#ff8000");
        assertThat(colors.hex(" Ferrari ")).isEqualTo("#dc2626");
    }

    @Test
    void unknownTeamsGetTheSameHashedColourAsTheFrontend() {
        assertThat(colors.hex("unknown-team")).isEqualTo("#51c2d6");
        assertThat(colors.hex("zz-racing")).isEqualTo("#51aed6");
        assertThat(colors.hex("connaught")).isEqualTo("#51d69d");
        assertThat(colors.hex("")).isEqualTo("#51d654");
        assertThat(colors.hex(" Kurtis-Kraft ")).isEqualTo("#bc51d6");
    }
}
