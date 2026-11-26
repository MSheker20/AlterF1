package com.msheker.alterf1.api;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebMvcTest(HealthController.class)
class HealthControllerTest {

    @Autowired
    MockMvcTester mvc;

    @Test
    void healthReturnsUpServiceAndVersion() {
        assertThat(mvc.get().uri("/api/v1/health"))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.status")
                .isEqualTo("UP");
        assertThat(mvc.get().uri("/api/v1/health"))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.service")
                .isEqualTo("alterf1-backend");
        assertThat(mvc.get().uri("/api/v1/health"))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.version")
                .isEqualTo("0.0.1");
    }
}
