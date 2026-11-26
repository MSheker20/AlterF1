package com.msheker.alterf1.api;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.msheker.alterf1.api.StandingsDtos.SeasonSummary;
import com.msheker.alterf1.api.StandingsDtos.StandingsResponse;
import com.msheker.alterf1.api.StandingsDtos.SystemInfo;

@RestController
@RequestMapping("/api/v1")
public class StandingsController {

    private final StandingsService service;

    public StandingsController(StandingsService service) {
        this.service = service;
    }

    /** Every season with its real champion, oldest first. */
    @GetMapping("/seasons")
    public List<SeasonSummary> seasons() {
        return service.seasons();
    }

    /** The five historical points systems. */
    @GetMapping("/systems")
    public List<SystemInfo> systems() {
        return service.systems();
    }

    /**
     * The drivers' championship of a season under a points system and an optional scenario.
     * Readable parameters make shareable URLs (PLAN.md §2.2).
     */
    @GetMapping("/seasons/{year}/standings")
    public StandingsResponse standings(
            @PathVariable int year,
            @RequestParam String system,
            @RequestParam(defaultValue = "historical") String preset,
            @RequestParam(required = false) String exclude,
            @RequestParam(required = false) String skip,
            @RequestParam(required = false) String sprint,
            @RequestParam(name = "fl", required = false) String fastestLap,
            @RequestParam(required = false) String custom,
            @RequestParam(name = "customFl", required = false) String customFastestLap,
            @RequestParam(required = false) String customSprint,
            @RequestParam(required = false) Integer customBest) {
        return service.standings(year, new StandingsQuery(system, preset, exclude, skip, sprint, fastestLap,
                custom, customFastestLap, customSprint, customBest));
    }
}
