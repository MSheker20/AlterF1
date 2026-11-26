package com.msheker.alterf1.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

import com.msheker.alterf1.support.AbstractF1dbIntegrationTest;

/** The standings API against the real F1DB release, end to end through Spring MVC. */
@AutoConfigureMockMvc
class StandingsApiIT extends AbstractF1dbIntegrationTest {

    @Autowired
    MockMvcTester mvc;

    @Test
    void season1988Under1991RulesChangesTheChampion() {
        var response = assertThat(mvc.get().uri("/api/v1/seasons/1988/standings?system=1991"))
                .hasStatusOk()
                .bodyJson();

        response.extractingPath("$.season").isEqualTo(1988);
        response.extractingPath("$.system").isEqualTo("1991");
        response.extractingPath("$.realSystem").isEqualTo("1961");
        response.extractingPath("$.preset").isEqualTo("historical");
        response.extractingPath("$.championChanged").isEqualTo(true);
        response.extractingPath("$.champion.driverId").isEqualTo("alain-prost");
        response.extractingPath("$.realChampion.driverId").isEqualTo("ayrton-senna");
        response.extractingPath("$.races.length()").isEqualTo(16);
        response.extractingPath("$.races[0].code").isEqualTo("BRA");
        response.extractingPath("$.standings[0].driverCode").isEqualTo("PRO");
        response.extractingPath("$.standings[0].constructorName").isEqualTo("McLaren");
        response.extractingPath("$.standings[0].realPosition").isEqualTo(2);
        response.extractingPath("$.standings[0].positionChange").isEqualTo(1);
        response.extractingPath("$.standings[0].results.length()").isEqualTo(16);
        response.extractingPath("$.standings[1].results[0]").isEqualTo("DSQ"); // Senna, Brazil 1988
    }

    @Test
    void realSystemGivesTheRealChampionship() {
        var response = assertThat(mvc.get().uri("/api/v1/seasons/1988/standings?system=1961"))
                .hasStatusOk()
                .bodyJson();

        response.extractingPath("$.championChanged").isEqualTo(false);
        response.extractingPath("$.standings[0].driverId").isEqualTo("ayrton-senna");
        response.extractingPath("$.standings[0].positionChange").isEqualTo(0);
    }

    @Test
    void unknownSystemIsABadRequestProblem() {
        assertThat(mvc.get().uri("/api/v1/seasons/1988/standings?system=1999"))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .hasContentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
                .bodyJson()
                .extractingPath("$.detail").asString().contains("1999");
    }

    @Test
    void missingSystemIsABadRequestProblem() {
        assertThat(mvc.get().uri("/api/v1/seasons/1988/standings"))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .hasContentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
    }

    @Test
    void seasonWithoutDataIsNotFound() {
        assertThat(mvc.get().uri("/api/v1/seasons/1949/standings?system=1991"))
                .hasStatus(HttpStatus.NOT_FOUND)
                .hasContentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
                .bodyJson()
                .extractingPath("$.title").isEqualTo("Season not found");
    }

    @Test
    void listsSeasonsWithTheirRealChampions() {
        var response = assertThat(mvc.get().uri("/api/v1/seasons")).hasStatusOk().bodyJson();

        response.extractingPath("$[0].year").isEqualTo(1950);
        response.extractingPath("$[0].champion.driverId").isEqualTo("nino-farina");
    }

    @Test
    void removingVerstappenFrom2023ChangesTheChampion() {
        var response = assertThat(mvc.get().uri("/api/v1/seasons/2023/standings?system=2010&exclude=max-verstappen"))
                .hasStatusOk()
                .bodyJson();

        response.extractingPath("$.championChanged").isEqualTo(true);
        response.extractingPath("$.scenario.excludedDrivers[0]").isEqualTo("max-verstappen");
        response.extractingPath("$.standings[*].driverId").asArray().doesNotContain("max-verstappen");
        response.extractingPath("$.entrants[0].driverId").isEqualTo("max-verstappen");
        response.extractingPath("$.entrants[0].excluded").isEqualTo(true);
    }

    @Test
    void aCustomSystemWithThe1991TableMatchesThe1991System() {
        var response = assertThat(mvc.get().uri("/api/v1/seasons/1988/standings?system=custom&custom=10,6,4,3,2,1"))
                .hasStatusOk()
                .bodyJson();

        response.extractingPath("$.system").isEqualTo("custom");
        response.extractingPath("$.champion.driverId").isEqualTo("alain-prost");
        response.extractingPath("$.champion.points").isEqualTo(112.0);
        response.extractingPath("$.rules.bestResults.type").isEqualTo("all");
        response.extractingPath("$.scenario.custom.racePoints.length()").isEqualTo(6);
    }

    @Test
    void echoesTheRealRulesAndSkippedRaces() {
        var response = assertThat(mvc.get().uri("/api/v1/seasons/1988/standings?system=1961&skip=1"))
                .hasStatusOk()
                .bodyJson();

        response.extractingPath("$.rules.bestResults.type").isEqualTo("season");
        response.extractingPath("$.rules.bestResults.count").isEqualTo(11);
        response.extractingPath("$.races[0].skipped").isEqualTo(true);
        response.extractingPath("$.races[1].skipped").isEqualTo(false);
        response.extractingPath("$.scenario.skippedRounds[0]").isEqualTo(1);
    }

    @Test
    void invalidScenariosAreBadRequests() {
        for (String query : List.of(
                "system=2010&exclude=nobody",
                "system=2010&skip=99",
                "system=1961&skip=" + String.join(",", java.util.stream.IntStream.rangeClosed(1, 16)
                        .mapToObj(String::valueOf).toList()),
                "system=custom&custom=25,abc",
                "system=custom",
                "system=custom&custom=25,18&customBest=0",
                "system=2010&sprint=maybe")) {
            assertThat(mvc.get().uri("/api/v1/seasons/1988/standings?" + query))
                    .as(query)
                    .hasStatus(HttpStatus.BAD_REQUEST)
                    .hasContentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
        }
    }

    @Test
    void raceResultsAreRenumberedLikeThePoints() {
        // Bahrain 2023: Verstappen won, Pérez was second. Without Verstappen, Pérez wins it.
        var response = assertThat(mvc.get().uri("/api/v1/seasons/2023/standings?system=2010&exclude=max-verstappen"))
                .hasStatusOk()
                .bodyJson();

        response.extractingPath("$.standings[0].driverId").isEqualTo("sergio-perez");
        response.extractingPath("$.standings[0].results[0]").isEqualTo("1");
    }

    @Test
    void customPointsMustBePlainNumbersInEveryPosition() {
        for (String custom : List.of("1,0e-10000000", "25,,18", ",25", "25,-1", "25,1001", "25,1.234")) {
            assertThat(mvc.get().uri("/api/v1/seasons/1988/standings?system=custom&custom=" + custom))
                    .as(custom)
                    .hasStatus(HttpStatus.BAD_REQUEST)
                    .bodyJson()
                    .extractingPath("$.field").isEqualTo("custom");
        }
    }

    @Test
    void compareShowsEverySystemSideBySide() {
        var response = assertThat(mvc.get().uri("/api/v1/seasons/1988/compare")).hasStatusOk().bodyJson();

        response.extractingPath("$.realSystem").isEqualTo("1961");
        response.extractingPath("$.systems.length()").isEqualTo(5);
        response.extractingPath("$.systems[1].id").isEqualTo("1961");
        response.extractingPath("$.systems[1].championChanged").isEqualTo(false);
        response.extractingPath("$.systems[2].id").isEqualTo("1991");
        response.extractingPath("$.systems[2].champion.driverId").isEqualTo("alain-prost");
        response.extractingPath("$.systems[2].championChanged").isEqualTo(true);
        response.extractingPath("$.drivers[0].driverId").isEqualTo("ayrton-senna");
        response.extractingPath("$.drivers[0].realPosition").isEqualTo(1);
        response.extractingPath("$.drivers[0].cells.1961.position").isEqualTo(1);
        response.extractingPath("$.drivers[0].cells.1991.position").isEqualTo(2);
    }

    @Test
    void compareAddsTheCustomColumnWhenGiven() {
        assertThat(mvc.get().uri("/api/v1/seasons/1988/compare?custom=10,6,4,3,2,1"))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.systems[5].id").isEqualTo("custom");
    }

    @Test
    void compareRejectsCustomParametersWithoutPoints() {
        assertThat(mvc.get().uri("/api/v1/seasons/1988/compare?customBest=5"))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson()
                .extractingPath("$.field").isEqualTo("custom");
    }

    @Test
    void progressionFindsTheRaceThatDecidedTheTitle() {
        // 2023: Verstappen could no longer be caught after Qatar (round 17).
        var modern = assertThat(mvc.get().uri("/api/v1/seasons/2023/progression?system=2010"))
                .hasStatusOk()
                .bodyJson();
        modern.extractingPath("$.clinch.round").isEqualTo(17);
        modern.extractingPath("$.clinch.code").isEqualTo("QAT");
        modern.extractingPath("$.clinch.driverId").isEqualTo("max-verstappen");
        modern.extractingPath("$.drivers[0].points[21]").isEqualTo(575.0);

        // 1988, best 11 results: Senna decided it at Suzuka (round 15), dropped scores included.
        var bestN = assertThat(mvc.get().uri("/api/v1/seasons/1988/progression?system=1961"))
                .hasStatusOk()
                .bodyJson();
        bestN.extractingPath("$.clinch.round").isEqualTo(15);
        bestN.extractingPath("$.clinch.code").isEqualTo("JPN");
        bestN.extractingPath("$.clinch.driverId").isEqualTo("ayrton-senna");
        bestN.extractingPath("$.drivers[0].points[15]").isEqualTo(90.0);
    }

    @Test
    void badRequestsNameTheParameterAtFault() {
        Map<String, String> expected = Map.of(
                "system=2010&exclude=nobody", "exclude",
                "system=2010&skip=99", "skip",
                "system=custom&custom=25,abc", "custom",
                "system=custom&custom=25,18&customBest=0", "customBest",
                "system=2010&fl=maybe", "fl",
                "system=2010&preset=wild", "preset",
                "system=1999", "system");
        expected.forEach((query, field) -> assertThat(mvc.get().uri("/api/v1/seasons/1988/standings?" + query))
                .as(query)
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson()
                .extractingPath("$.field").isEqualTo(field));
    }

    @Test
    void listsTheFiveSystems() {
        var response = assertThat(mvc.get().uri("/api/v1/systems")).hasStatusOk().bodyJson();

        response.extractingPath("$.length()").isEqualTo(5);
        response.extractingPath("$[4].id").isEqualTo("2010");
        response.extractingPath("$[4].lastSeason").isNull();
        response.extractingPath("$[0].racePoints.length()").isEqualTo(5);
    }
}
