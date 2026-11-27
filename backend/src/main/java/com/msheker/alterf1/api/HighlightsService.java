package com.msheker.alterf1.api;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import com.msheker.alterf1.api.StandingsDtos.Champion;
import com.msheker.alterf1.api.StandingsDtos.Highlight;
import com.msheker.alterf1.api.StandingsDtos.HighlightAlternative;
import com.msheker.alterf1.core.DriverStanding;
import com.msheker.alterf1.core.Scenario;
import com.msheker.alterf1.core.ScoringOptions;
import com.msheker.alterf1.core.ScoringSystem;
import com.msheker.alterf1.core.StandingsEngine;
import com.msheker.alterf1.data.SessionResult;
import com.msheker.alterf1.data.SeasonResultsRepository;

/**
 * Every season under every system, scored once (PLAN.md §2.0 and §4): the seasons whose champion
 * changes under another system become the home page cards. Uses the default preset and no scenario.
 */
@Service
public class HighlightsService {

    private static final Logger log = LoggerFactory.getLogger(HighlightsService.class);

    private final SeasonResultsRepository repository;
    private final StandingsEngine engine = new StandingsEngine();
    private volatile List<Highlight> cached;

    public HighlightsService(SeasonResultsRepository repository) {
        this.repository = repository;
    }

    /** Warm the cache in the background so the first visitor does not wait for the whole history. */
    @EventListener(ApplicationReadyEvent.class)
    void warmUp() {
        Thread.ofVirtual().name("highlights-warmup").start(() -> {
            try {
                highlights();
            } catch (RuntimeException e) {
                log.warn("Could not precompute highlights; they will be computed on first request.", e);
            }
        });
    }

    public List<Highlight> highlights() {
        List<Highlight> result = cached;
        if (result == null) {
            synchronized (this) {
                result = cached;
                if (result == null) {
                    long start = System.nanoTime();
                    result = compute();
                    cached = result;
                    log.info("Computed {} highlights in {} ms", result.size(), (System.nanoTime() - start) / 1_000_000);
                }
            }
        }
        return result;
    }

    private List<Highlight> compute() {
        List<Highlight> highlights = new ArrayList<>();
        for (int year : repository.findSeasons()) {
            Optional<Champion> realOne = repository.findChampion(year)
                    .map(c -> new Champion(c.driverId(), c.driverName(), c.points()));
            if (realOne.isEmpty()) {
                continue;
            }
            List<SessionResult> results = repository.findBySeason(year);
            if (results.isEmpty()) {
                continue;
            }
            Champion realChampion = realOne.get();
            ScoringSystem realSystem = ScoringSystem.historicalFor(year);
            List<HighlightAlternative> alternatives = new ArrayList<>();
            String realChampionTeam = null;
            for (ScoringSystem system : ScoringSystem.values()) {
                if (system == realSystem) {
                    continue;
                }
                List<DriverStanding> standings = engine.compute(results, system, ScoringOptions.HISTORICAL,
                        Scenario.NONE);
                if (standings.isEmpty()) {
                    continue;
                }
                Champion champion = StandingsService.champion(standings, realChampion);
                if (champion.driverId().equals(realChampion.driverId())) {
                    continue;
                }
                DriverStanding winner = standings.stream()
                        .filter(s -> s.driverId().equals(champion.driverId())).findFirst().orElseThrow();
                Optional<DriverStanding> real = standings.stream()
                        .filter(s -> s.driverId().equals(realChampion.driverId())).findFirst();
                if (real.isPresent()) {
                    realChampionTeam = real.get().constructorId();
                    alternatives.add(new HighlightAlternative(system.id(), champion, winner.constructorId(),
                            real.get().position(), real.get().points()));
                }
            }
            if (!alternatives.isEmpty()) {
                highlights.add(new Highlight(year, realSystem.id(), realChampion, realChampionTeam, List.copyOf(alternatives)));
            }
        }
        return List.copyOf(highlights);
    }
}
