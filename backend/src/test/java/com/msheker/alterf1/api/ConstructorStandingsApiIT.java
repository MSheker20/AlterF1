package com.msheker.alterf1.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

import com.msheker.alterf1.support.AbstractF1dbIntegrationTest;

/** End-to-end tests for the constructors' championship endpoints against the real F1DB release. */
@AutoConfigureMockMvc
class ConstructorStandingsApiIT extends AbstractF1dbIntegrationTest {

    @Autowired
    MockMvcTester mvc;

    @Test
    void constructorsStandingsHappyPathAndHistoricalRules() {
        // 1960: bestCarOnly=true, best 6 of 9 non-Indy races; Cooper Climax and Cooper Maserati are separate teams.
        var s1960 = assertThat(mvc.get().uri("/api/v1/seasons/1960/constructors?system=1950"))
                .hasStatusOk()
                .bodyJson();

        s1960.extractingPath("$.season").isEqualTo(1960);
        s1960.extractingPath("$.system").isEqualTo("1950");
        s1960.extractingPath("$.realSystem").isEqualTo("1950");
        s1960.extractingPath("$.alternative").isEqualTo(false);
        s1960.extractingPath("$.championChanged").isEqualTo(false);
        s1960.extractingPath("$.champion.teamId").isEqualTo("cooper:climax");
        s1960.extractingPath("$.champion.teamName").isEqualTo("Cooper Climax");
        s1960.extractingPath("$.champion.points").isEqualTo(48.0);
        s1960.extractingPath("$.realChampion.teamId").isEqualTo("cooper:climax");
        s1960.extractingPath("$.constructorRules.bestCarOnly").isEqualTo(true);
        s1960.extractingPath("$.constructorRules.bestResults.type").isEqualTo("season");
        s1960.extractingPath("$.constructorRules.bestResults.count").isEqualTo(6);
        s1960.extractingPath("$.standings[*].teamId").asArray()
                .contains("cooper:climax", "cooper:maserati", "ferrari:ferrari");

        // 2007: McLaren excluded from constructors (data-driven), Ferrari is champion with 204.
        var s2007 = assertThat(mvc.get().uri("/api/v1/seasons/2007/constructors?system=2003"))
                .hasStatusOk()
                .bodyJson();

        s2007.extractingPath("$.champion.teamId").isEqualTo("ferrari:ferrari");
        s2007.extractingPath("$.champion.teamName").isEqualTo("Ferrari");
        s2007.extractingPath("$.champion.points").isEqualTo(204.0);
        s2007.extractingPath("$.championChanged").isEqualTo(false);
        s2007.extractingPath("$.constructorRules.bestCarOnly").isEqualTo(false);
        s2007.extractingPath("$.constructorRules.bestResults.type").isEqualTo("all");
        s2007.extractingPath("$.notes").asArray().contains("ineligible");
    }

    @Test
    void pre1958SeasonIsMarkedAlternativeWithNoRealChampion() {
        var response = assertThat(mvc.get().uri("/api/v1/seasons/1955/constructors?system=1950"))
                .hasStatusOk()
                .bodyJson();

        response.extractingPath("$.season").isEqualTo(1955);
        response.extractingPath("$.alternative").isEqualTo(true);
        response.extractingPath("$.realChampion").isNull();
        response.extractingPath("$.championChanged").isEqualTo(false);
        response.extractingPath("$.champion.teamId").isEqualTo("mercedes:mercedes");
        response.extractingPath("$.champion.teamName").isEqualTo("Mercedes");
        response.extractingPath("$.constructorRules.bestCarOnly").isEqualTo(true);
        response.extractingPath("$.standings[0].realPosition").isNull();
        response.extractingPath("$.standings[0].positionChange").isNull();
        response.extractingPath("$.standings[0].realPoints").isNull();
        // Indy 500 (round 3 in 1955) is excluded from the constructors' race list, matching progression.
        response.extractingPath("$.races.length()").isEqualTo(6);
        response.extractingPath("$.races[*].grandPrixId").asArray().doesNotContain("indianapolis");
        response.extractingPath("$.races[*].round").asArray().containsExactly(1, 2, 4, 5, 6, 7);

        var progression = assertThat(mvc.get().uri("/api/v1/seasons/1955/constructors/progression?system=1950"))
                .hasStatusOk()
                .bodyJson();
        progression.extractingPath("$.races[*].round").asArray().containsExactly(1, 2, 4, 5, 6, 7);
    }

    @Test
    void skippingAllNonIndyRacesOrIndyRoundReturnsSkipFieldBadRequest() {
        for (String uri : List.of(
                "/api/v1/seasons/1955/constructors?system=1950&skip=1,2,4,5,6,7",
                "/api/v1/seasons/1955/constructors/compare?skip=1,2,4,5,6,7",
                "/api/v1/seasons/1955/constructors/progression?system=1950&skip=1,2,4,5,6,7",
                "/api/v1/seasons/1955/constructors?system=1950&skip=3")) {
            assertThat(mvc.get().uri(uri))
                    .as(uri)
                    .hasStatus(HttpStatus.BAD_REQUEST)
                    .hasContentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
                    .bodyJson()
                    .extractingPath("$.field").isEqualTo("skip");
        }
    }

    @Test
    void constructorsSupportsScenariosAndCustomSystems() {
        var response = assertThat(mvc.get().uri(
                "/api/v1/seasons/2023/constructors?system=custom&custom=10,6,4,3,2,1&exclude=max-verstappen"))
                .hasStatusOk()
                .bodyJson();

        response.extractingPath("$.system").isEqualTo("custom");
        response.extractingPath("$.scenario.excludedDrivers[0]").isEqualTo("max-verstappen");
        response.extractingPath("$.constructorRules.bestCarOnly").isEqualTo(false);
        response.extractingPath("$.constructorRules.bestResults.type").isEqualTo("all");
        response.extractingPath("$.entrants[0].driverId").isEqualTo("max-verstappen");
        response.extractingPath("$.entrants[0].excluded").isEqualTo(true);
    }

    @Test
    void compareShowsEverySystemSideBySideAndSupportsCustomAndAlternative() {
        var s1988 = assertThat(mvc.get().uri("/api/v1/seasons/1988/constructors/compare"))
                .hasStatusOk()
                .bodyJson();

        s1988.extractingPath("$.season").isEqualTo(1988);
        s1988.extractingPath("$.realSystem").isEqualTo("1961");
        s1988.extractingPath("$.alternative").isEqualTo(false);
        s1988.extractingPath("$.systems.length()").isEqualTo(5);
        s1988.extractingPath("$.systems[1].id").isEqualTo("1961");
        s1988.extractingPath("$.systems[1].champion.teamId").isEqualTo("mclaren:honda");
        s1988.extractingPath("$.systems[1].championChanged").isEqualTo(false);
        s1988.extractingPath("$.teams[0].teamId").isEqualTo("mclaren:honda");
        s1988.extractingPath("$.teams[0].teamName").isEqualTo("McLaren Honda");
        s1988.extractingPath("$.teams[0].realPosition").isEqualTo(1);
        s1988.extractingPath("$.teams[0].cells.1961.points").isEqualTo(199.0);

        // With custom system column added.
        assertThat(mvc.get().uri("/api/v1/seasons/1988/constructors/compare?custom=10,6,4,3,2,1"))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.systems[5].id").isEqualTo("custom");

        // Pre-1958 alternative season.
        var s1955 = assertThat(mvc.get().uri("/api/v1/seasons/1955/constructors/compare"))
                .hasStatusOk()
                .bodyJson();
        s1955.extractingPath("$.alternative").isEqualTo(true);
        s1955.extractingPath("$.systems[0].championChanged").isEqualTo(false);
        s1955.extractingPath("$.teams[0].realPosition").isNull();
    }

    @Test
    void progressionComputesTotalsAndClinchRaceForConstructors() {
        // 2023: Red Bull clinched the constructors' championship at Japan (round 16).
        var s2023 = assertThat(mvc.get().uri("/api/v1/seasons/2023/constructors/progression?system=2010"))
                .hasStatusOk()
                .bodyJson();

        s2023.extractingPath("$.season").isEqualTo(2023);
        s2023.extractingPath("$.system").isEqualTo("2010");
        s2023.extractingPath("$.alternative").isEqualTo(false);
        s2023.extractingPath("$.clinch.round").isEqualTo(16);
        s2023.extractingPath("$.clinch.code").isEqualTo("JPN");
        s2023.extractingPath("$.clinch.teamId").isEqualTo("red-bull:honda-rbpt");
        s2023.extractingPath("$.teams[0].teamId").isEqualTo("red-bull:honda-rbpt");
        s2023.extractingPath("$.teams[0].points[21]").isEqualTo(860.0);

        // Pre-1958 alternative progression excludes Indy 500 (1955 had 6 non-Indy Grands Prix).
        var s1955 = assertThat(mvc.get().uri("/api/v1/seasons/1955/constructors/progression?system=1950"))
                .hasStatusOk()
                .bodyJson();
        s1955.extractingPath("$.alternative").isEqualTo(true);
        s1955.extractingPath("$.races.length()").isEqualTo(6);
    }

    @Test
    void badInputAndUnknownSeasonReturnProblemDetails() {
        for (String uri : List.of(
                "/api/v1/seasons/1988/constructors?system=1999",
                "/api/v1/seasons/1988/constructors",
                "/api/v1/seasons/1988/constructors/progression?system=1999",
                "/api/v1/seasons/1988/constructors/compare?customBest=5")) {
            assertThat(mvc.get().uri(uri))
                    .as(uri)
                    .hasStatus(HttpStatus.BAD_REQUEST)
                    .hasContentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
        }

        assertThat(mvc.get().uri("/api/v1/seasons/1949/constructors?system=1991"))
                .hasStatus(HttpStatus.NOT_FOUND)
                .hasContentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
                .bodyJson()
                .extractingPath("$.title").isEqualTo("Season not found");
    }
}
