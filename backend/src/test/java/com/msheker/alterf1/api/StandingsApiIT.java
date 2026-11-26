package com.msheker.alterf1.api;

import static org.assertj.core.api.Assertions.assertThat;

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
    void listsTheFiveSystems() {
        var response = assertThat(mvc.get().uri("/api/v1/systems")).hasStatusOk().bodyJson();

        response.extractingPath("$.length()").isEqualTo(5);
        response.extractingPath("$[4].id").isEqualTo("2010");
        response.extractingPath("$[4].lastSeason").isNull();
        response.extractingPath("$[0].racePoints.length()").isEqualTo(5);
    }
}
