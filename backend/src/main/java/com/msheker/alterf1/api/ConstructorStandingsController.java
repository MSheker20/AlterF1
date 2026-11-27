package com.msheker.alterf1.api;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.msheker.alterf1.api.ConstructorStandingsDtos.ConstructorCompareResponse;
import com.msheker.alterf1.api.ConstructorStandingsDtos.ConstructorProgressionResponse;
import com.msheker.alterf1.api.ConstructorStandingsDtos.ConstructorStandingsResponse;

/** Constructors' championship endpoints, mirroring {@link StandingsController} with the same query contract. */
@RestController
@RequestMapping("/api/v1")
public class ConstructorStandingsController {

    private final ConstructorStandingsService service;

    public ConstructorStandingsController(ConstructorStandingsService service) {
        this.service = service;
    }

    /** The constructors' championship of a season under a points system and an optional scenario. */
    @GetMapping("/seasons/{year}/constructors")
    public ConstructorStandingsResponse constructors(
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

    /** The season's constructors' championship under every historical system side by side (plus custom, if given). */
    @GetMapping("/seasons/{year}/constructors/compare")
    public ConstructorCompareResponse compare(
            @PathVariable int year,
            @RequestParam(defaultValue = "historical") String preset,
            @RequestParam(required = false) String exclude,
            @RequestParam(required = false) String skip,
            @RequestParam(required = false) String sprint,
            @RequestParam(name = "fl", required = false) String fastestLap,
            @RequestParam(required = false) String custom,
            @RequestParam(name = "customFl", required = false) String customFastestLap,
            @RequestParam(required = false) String customSprint,
            @RequestParam(required = false) Integer customBest) {
        return service.compare(year, new StandingsQuery(null, preset, exclude, skip, sprint, fastestLap,
                custom, customFastestLap, customSprint, customBest));
    }

    /** Constructors' championship totals race by race under one system, and the race that decided the title. */
    @GetMapping("/seasons/{year}/constructors/progression")
    public ConstructorProgressionResponse progression(
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
        return service.progression(year, new StandingsQuery(system, preset, exclude, skip, sprint, fastestLap,
                custom, customFastestLap, customSprint, customBest));
    }
}
