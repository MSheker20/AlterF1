package com.msheker.alterf1.og;

import static org.assertj.core.api.Assertions.assertThat;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

import com.msheker.alterf1.support.AbstractF1dbIntegrationTest;

/** Link previews (PLAN.md §2.4): the Open Graph image and the small HTML page bots read. */
@AutoConfigureMockMvc
class OgApiIT extends AbstractF1dbIntegrationTest {

    @Autowired
    MockMvcTester mvc;

    @Test
    void seasonImageIsA1200x630Png() throws IOException {
        var result = mvc.get().uri("/og/season/1988.png?system=1991").exchange();

        assertThat(result).hasStatusOk().hasContentType(MediaType.IMAGE_PNG);
        assertThat(result.getResponse().getHeader("Cache-Control")).contains("max-age");
        BufferedImage image = ImageIO.read(new ByteArrayInputStream(result.getResponse().getContentAsByteArray()));
        assertThat(image.getWidth()).isEqualTo(1200);
        assertThat(image.getHeight()).isEqualTo(630);
    }

    @Test
    void turkishAndScenarioImagesRenderToo() {
        assertThat(mvc.get().uri("/og/season/2021.png?system=1961&lang=tr&exclude=max-verstappen"))
                .hasStatusOk().hasContentType(MediaType.IMAGE_PNG);
        assertThat(mvc.get().uri("/og/home.png?lang=tr")).hasStatusOk().hasContentType(MediaType.IMAGE_PNG);
    }

    @Test
    void imageOfAMissingSeasonIsNotFound() {
        assertThat(mvc.get().uri("/og/season/1949.png?system=1991")).hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void seasonPageCarriesTheHeadlineAndAnAbsoluteImageUrl() {
        var result = mvc.get().uri("/og/page/season/1988?system=1991")
                .header("X-Forwarded-Proto", "https")
                .header("X-Forwarded-Host", "alterf1.example")
                .exchange();

        assertThat(result).hasStatusOk().hasContentTypeCompatibleWith(MediaType.TEXT_HTML);
        assertThat(result).bodyText()
                .contains("<html lang=\"en\">")
                .contains("<meta property=\"og:title\" content=\"1988 under 1991 rules: Prost, not Senna\">")
                .contains("<meta property=\"og:image\" content=\"https://alterf1.example/og/season/1988.png?system=1991&amp;lang=en\">")
                .contains("<meta name=\"twitter:card\" content=\"summary_large_image\">")
                .contains("https://alterf1.example/season/1988?system=1991");
    }

    @Test
    void turkishSeasonPageIsInTurkishAndKeepsTheTab() {
        assertThat(mvc.get().uri("/og/page/tr/season/1988/compare?system=1991"))
                .hasStatusOk()
                .bodyText()
                .contains("<html lang=\"tr\">")
                .contains("1988, 1991 kurallarıyla: Senna değil Prost")
                .contains("og:locale\" content=\"tr_TR\"")
                .contains("/tr/season/1988/compare?system=1991");
    }

    @Test
    void homePageGetsTheSiteImage() {
        assertThat(mvc.get().uri("/og/page/")).hasStatusOk().bodyText()
                .contains("/og/home.png?lang=en")
                .contains("Same races. Different rules.");
    }

    @Test
    void scenarioValuesAreEscaped() {
        assertThat(mvc.get().uri("/og/page/season/1988?system=1991&exclude={x}", "\"><script>alert(1)</script>"))
                .hasStatusOk().bodyText()
                .doesNotContain("<script>")
                .contains("exclude=%22%3E%3Cscript%3E");
    }

    @Test
    void unknownPathsCannotRedirectOffSite() {
        var body = assertThat(mvc.get().uri("/og/page;@evil.com/")).hasStatusOk().bodyText();
        body.contains("<meta http-equiv=\"refresh\" content=\"0;url=/\">");
        body.doesNotContain("evil.com");
    }

    @Test
    void theRedirectStaysOnSiteWhateverTheForwardedHost() {
        assertThat(mvc.get().uri("/og/page/tr/season/1988?system=1991").header("X-Forwarded-Host", "evil.com"))
                .hasStatusOk().bodyText()
                .contains("<meta http-equiv=\"refresh\" content=\"0;url=/tr/season/1988?system=1991\">");
    }

    @Test
    void aBadScenarioStillGivesAPreviewButIsNotCached() {
        var result = mvc.get().uri("/og/page/season/1988?system=1999").exchange();
        assertThat(result).hasStatusOk().bodyText().contains("Same races. Different rules.");
        assertThat(result.getResponse().getHeader("Cache-Control")).contains("no-store");
    }
}
