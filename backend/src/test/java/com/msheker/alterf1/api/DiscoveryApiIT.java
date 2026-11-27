package com.msheker.alterf1.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

import com.msheker.alterf1.support.AbstractF1dbIntegrationTest;

/**
 * Season notes (PLAN.md §7) and the "champion changed" highlights of the home page (PLAN.md §2.0),
 * against the real F1DB release.
 */
@AutoConfigureMockMvc
class DiscoveryApiIT extends AbstractF1dbIntegrationTest {

    @Autowired
    MockMvcTester mvc;

    private List<String> notes(String query) {
        Object[] notes = assertThat(mvc.get().uri("/api/v1/seasons/" + query))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.notes")
                .asArray()
                .actual();
        return java.util.Arrays.stream(notes).map(String.class::cast).toList();
    }

    @Test
    void halfPointsOnlyWhenThePresetAppliesThem() {
        assertThat(notes("1991/standings?system=1991")).contains("half-points");
        assertThat(notes("1991/standings?system=1991&preset=pure")).doesNotContain("half-points");
    }

    @Test
    void doublePointsOnlyUnderTheSystemThatUsedThem() {
        assertThat(notes("2014/standings?system=2010")).contains("double-points");
        assertThat(notes("2014/standings?system=1991")).doesNotContain("double-points");
        assertThat(notes("2014/standings?system=1991&preset=all")).contains("double-points");
    }

    @Test
    void sharedCarsInTheFiftiesSplitThePoints() {
        assertThat(notes("1954/standings?system=1950")).contains("shared-points");
        assertThat(notes("1988/standings?system=1961")).doesNotContain("shared-points");
    }

    @Test
    void sprintTableIsAnAssumptionOnlyForSystemsWithoutOne() {
        assertThat(notes("2021/standings?system=1991")).contains("sprint-assumed");
        assertThat(notes("2021/standings?system=2010")).doesNotContain("sprint-assumed");
        assertThat(notes("2021/standings?system=1991&sprint=off")).doesNotContain("sprint-assumed");
        assertThat(notes("1988/standings?system=1991")).doesNotContain("sprint-assumed");
    }

    @Test
    void bestResultsAreScaledOnlyOutsideTheSystemsEra() {
        assertThat(notes("2021/standings?system=1961")).contains("best-scaled");
        assertThat(notes("1988/standings?system=1961")).doesNotContain("best-scaled");
        assertThat(notes("2021/standings?system=1991")).doesNotContain("best-scaled");
    }

    @Test
    void ineligibleFinishersAreFlagged() {
        assertThat(notes("1958/standings?system=1991")).contains("ineligible");
        assertThat(notes("2023/standings?system=2010")).isEmpty();
    }

    @Test
    void customSystemGetsNoSystemAssumptionNotes() {
        assertThat(notes("2021/standings?system=custom&custom=10,6,4,3,2,1&customBest=10"))
                .doesNotContain("sprint-assumed", "best-scaled");
    }

    @Test
    void highlightsListSeasonsWhoseChampionChanges() {
        var response = assertThat(mvc.get().uri("/api/v1/highlights")).hasStatusOk().bodyJson();

        response.extractingPath("$[?(@.season == 1988)].realChampion.driverId").asArray()
                .containsExactly("ayrton-senna");
        response.extractingPath("$[?(@.season == 1988)].alternatives[?(@.system == '1991')].champion.driverId")
                .asArray().containsExactly("alain-prost");
        // Under 1991 rules Senna is second: the card can show by how much.
        response.extractingPath("$[?(@.season == 1988)].alternatives[?(@.system == '1991')].realChampionPosition")
                .asArray().containsExactly(2);
        response.extractingPath("$[?(@.season == 1988)].alternatives[?(@.system == '1991')].championConstructorId")
                .asArray().containsExactly("mclaren");
        response.extractingPath("$[?(@.season == 1988)].realChampionConstructorId").asArray()
                .containsExactly("mclaren");
        // A season with the same champion under every system is not a highlight.
        response.extractingPath("$[?(@.season == 2023)]").asArray().isEmpty();
    }
}
