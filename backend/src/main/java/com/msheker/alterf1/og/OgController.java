package com.msheker.alterf1.og;

import java.time.Duration;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import org.springframework.web.util.HtmlUtils;
import org.springframework.web.util.UriComponentsBuilder;

import com.msheker.alterf1.api.ApiExceptions;
import com.msheker.alterf1.api.StandingsDtos.StandingsResponse;
import com.msheker.alterf1.api.StandingsQuery;
import com.msheker.alterf1.api.StandingsService;
import com.msheker.alterf1.core.ScoringSystem;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Link previews (PLAN.md §2.4). Crawlers do not run JavaScript, so the dev proxy (and later the
 * web server) sends their requests for a page to {@code /og/page/...}: a tiny HTML page with Open
 * Graph tags pointing at {@code /og/season/{year}.png}. People who land on it are sent on to the SPA.
 */
@RestController
@RequestMapping("/og")
public class OgController {

    /** Scenario parameters the SPA keeps in the URL (PLAN.md §2.2); anything else is dropped. */
    private static final List<String> SCENARIO_PARAMS = List.of("system", "preset", "exclude", "skip", "sprint",
            "fl", "custom", "customFl", "customSprint", "customBest");
    private static final Pattern SEASON_PATH = Pattern.compile("^/season/(\\d{4})(/compare|/progression)?/?$");
    private static final CacheControl CACHE = CacheControl.maxAge(Duration.ofHours(1)).cachePublic();

    private final StandingsService standings;
    private final OgImageRenderer renderer;
    private final String publicOrigin;
    /** The site image never changes: one PNG per language, drawn once. */
    private final Map<OgLanguage, byte[]> homeImages = new EnumMap<>(OgLanguage.class);

    /**
     * @param publicOrigin the site's public origin ("https://alterf1.example") for absolute Open Graph
     *                     URLs; empty in local development, where the request (via the dev proxy) tells it
     */
    public OgController(StandingsService standings, OgImageRenderer renderer,
            @Value("${alterf1.public-origin:}") String publicOrigin) {
        this.standings = standings;
        this.renderer = renderer;
        this.publicOrigin = publicOrigin.endsWith("/") ? publicOrigin.substring(0, publicOrigin.length() - 1)
                : publicOrigin;
    }

    @GetMapping(value = "/season/{year}.png", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> seasonImage(@PathVariable int year,
            @RequestParam(defaultValue = "en") String lang,
            @RequestParam MultiValueMap<String, String> params) {
        Map<String, String> scenario = scenarioParams(params);
        StandingsResponse response = standings.standings(year, query(year, scenario));
        byte[] png = renderer.season(response, OgLanguage.of(lang), isScenario(scenario));
        return ResponseEntity.ok().cacheControl(CACHE).contentType(MediaType.IMAGE_PNG).body(png);
    }

    @GetMapping(value = "/home.png", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> homeImage(@RequestParam(defaultValue = "en") String lang) {
        OgLanguage language = OgLanguage.of(lang);
        byte[] png;
        synchronized (homeImages) {
            png = homeImages.computeIfAbsent(language, renderer::home);
        }
        return ResponseEntity.ok().cacheControl(CACHE).contentType(MediaType.IMAGE_PNG).body(png);
    }

    @GetMapping(value = "/page/**", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> page(HttpServletRequest request,
            @RequestParam MultiValueMap<String, String> params) {
        String requested = request.getRequestURI().substring(request.getContextPath().length());
        requested = requested.startsWith("/og/page") ? requested.substring("/og/page".length()) : "/";
        OgLanguage lang = OgLanguage.EN;
        if (requested.equals("/tr") || requested.startsWith("/tr/")) {
            lang = OgLanguage.TR;
            requested = requested.substring(3);
        }
        // Only known SPA routes; anything else (";@evil.com", "//host", encoded tricks) is the home page.
        Matcher season = SEASON_PATH.matcher(requested);
        String path = season.matches() || requested.equals("/about") || requested.equals("/about/")
                ? requested
                : "/";
        Map<String, String> scenario = scenarioParams(params);
        String query = queryString(scenario);
        // Relative, so the redirect can only stay on this site whatever the request headers say.
        String relativeUrl = (lang == OgLanguage.TR ? "/tr" + (path.equals("/") ? "" : path) : path) + query;
        String origin = origin();

        String title = lang.homeTitle();
        String description = lang.tagline();
        String image = origin + "/og/home.png?lang=" + lang.code();
        CacheControl cache = CACHE;
        if (season.matches()) {
            int year = Integer.parseInt(season.group(1));
            try {
                StandingsResponse s = standings.standings(year, query(year, scenario));
                title = seasonTitle(s, lang);
                description = summary(s, lang) + " " + lang.tagline();
                image = origin + "/og/season/" + year + ".png" + queryString(withLang(scenario, lang));
            } catch (RuntimeException e) {
                if (!ApiExceptions.isClientError(e)) {
                    throw e; // a server fault is a 5xx, not a cached generic preview
                }
                // Unknown season or bad scenario: still a valid page with the generic preview.
                cache = CacheControl.noStore();
            }
        }
        return ResponseEntity.ok().cacheControl(cache).contentType(new MediaType(MediaType.TEXT_HTML,
                java.nio.charset.StandardCharsets.UTF_8))
                .body(html(lang, title, description, image, origin + relativeUrl, relativeUrl));
    }

    /** Configured public origin, else (local development) the one the request came through. */
    private String origin() {
        if (!publicOrigin.isEmpty()) {
            return publicOrigin;
        }
        return ServletUriComponentsBuilder.fromCurrentContextPath().replacePath(null).replaceQuery(null).build()
                .toUriString();
    }

    private static String seasonTitle(StandingsResponse s, OgLanguage lang) {
        String champion = s.champion() == null ? "—" : OgImageRenderer.surname(s.champion().driverName());
        if (s.championChanged() && s.realChampion() != null) {
            return lang.changedTitle(s.season(), s.system(), champion,
                    OgImageRenderer.surname(s.realChampion().driverName()));
        }
        return lang.sameTitle(s.season(), s.system(), champion);
    }

    /** "Prost 105 · Senna 94 · Berger 41" */
    private static String summary(StandingsResponse s, OgLanguage lang) {
        return s.standings().stream().limit(3)
                .map(l -> OgImageRenderer.surname(l.driverName()) + " " + OgImageRenderer.points(l.points(), lang))
                .collect(Collectors.joining(" · ")) + ".";
    }

    private static String html(OgLanguage lang, String title, String description, String image, String url,
            String relativeUrl) {
        String t = HtmlUtils.htmlEscape(title);
        String d = HtmlUtils.htmlEscape(description);
        String i = HtmlUtils.htmlEscape(image);
        String u = HtmlUtils.htmlEscape(url);
        String r = HtmlUtils.htmlEscape(relativeUrl);
        return """
                <!doctype html>
                <html lang="%s">
                <head>
                <meta charset="utf-8">
                <title>%s · AlterF1</title>
                <meta name="description" content="%s">
                <meta property="og:type" content="website">
                <meta property="og:site_name" content="AlterF1">
                <meta property="og:locale" content="%s">
                <meta property="og:title" content="%s">
                <meta property="og:description" content="%s">
                <meta property="og:url" content="%s">
                <meta property="og:image" content="%s">
                <meta property="og:image:width" content="%d">
                <meta property="og:image:height" content="%d">
                <meta name="twitter:card" content="summary_large_image">
                <link rel="canonical" href="%s">
                <meta http-equiv="refresh" content="0;url=%s">
                </head>
                <body><a href="%s">%s</a></body>
                </html>
                """.formatted(lang.code(), t, d, lang.locale(), t, d, u, i, OgImageRenderer.WIDTH,
                OgImageRenderer.HEIGHT, u, r, r, t);
    }

    private static Map<String, String> scenarioParams(MultiValueMap<String, String> params) {
        Map<String, String> out = new java.util.LinkedHashMap<>();
        for (String name : SCENARIO_PARAMS) {
            String value = params.getFirst(name);
            if (value != null && !value.isBlank()) {
                out.put(name, value);
            }
        }
        return out;
    }

    private static Map<String, String> withLang(Map<String, String> scenario, OgLanguage lang) {
        Map<String, String> out = new java.util.LinkedHashMap<>(scenario);
        out.put("lang", lang.code());
        return out;
    }

    private static String queryString(Map<String, String> params) {
        if (params.isEmpty()) {
            return "";
        }
        UriComponentsBuilder b = UriComponentsBuilder.newInstance();
        params.forEach(b::queryParam);
        return b.encode().build().toUriString();
    }

    private static boolean isScenario(Map<String, String> scenario) {
        return scenario.keySet().stream().anyMatch(k -> !k.equals("system") && !k.equals("preset"))
                || (scenario.containsKey("preset") && !"historical".equals(scenario.get("preset")));
    }

    private static StandingsQuery query(int year, Map<String, String> p) {
        String system = p.get("system");
        if (system == null) {
            // The SPA's default: the system really used that season (a year before 1950 is a 404 later).
            system = year >= 1950 ? ScoringSystem.historicalFor(year).id() : ScoringSystem.S2010.id();
        }
        Integer best = null;
        if (p.containsKey("customBest")) {
            try {
                best = Integer.valueOf(p.get("customBest"));
            } catch (NumberFormatException e) {
                best = -1; // rejected by the query's own validation
            }
        }
        return new StandingsQuery(system, p.getOrDefault("preset", "historical"), p.get("exclude"), p.get("skip"),
                p.get("sprint"), p.get("fl"), p.get("custom"), p.get("customFl"), p.get("customSprint"), best);
    }
}
