package com.msheker.alterf1.api;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import com.msheker.alterf1.api.StandingsDtos.BestResultsInfo;
import com.msheker.alterf1.api.StandingsDtos.CompareCell;
import com.msheker.alterf1.api.StandingsDtos.Entrant;
import com.msheker.alterf1.api.StandingsDtos.ProgressionRace;
import com.msheker.alterf1.api.StandingsDtos.RaceInfo;
import com.msheker.alterf1.api.StandingsDtos.RulesInfo;
import com.msheker.alterf1.api.StandingsDtos.ScenarioInfo;

/**
 * JSON shapes of the constructors' championship API, mirroring {@link StandingsDtos} with team
 * identity ({@code teamId}, {@code constructorId}, {@code engineManufacturerId}, {@code teamName}).
 */
public final class ConstructorStandingsDtos {

    private ConstructorStandingsDtos() {
    }

    public record ConstructorChampion(
            String teamId,
            String constructorId,
            String engineManufacturerId,
            String teamName,
            BigDecimal points) {
    }

    /** Constructors-specific scoring rules applied to this season. */
    public record ConstructorRulesInfo(boolean bestCarOnly, BestResultsInfo bestResults) {
    }

    /**
     * @param realPosition   the team's real constructors' position, {@code null} if unclassified or pre-1958
     * @param positionChange realPosition − position (positive = gained places), {@code null} if unknown
     * @param results        one entry per race of {@link ConstructorStandingsResponse#races()}: the team's
     *                       best renumbered finish ("1", "DNF", ...) or "" (not entered / Indy 500)
     */
    public record ConstructorStandingLine(
            int position,
            Integer realPosition,
            Integer positionChange,
            String teamId,
            String constructorId,
            String engineManufacturerId,
            String teamName,
            BigDecimal points,
            BigDecimal realPoints,
            int wins,
            int podiums,
            List<String> results) {
    }

    /**
     * @param alternative true before 1958, when no official constructors' championship existed
     *                    ({@code realChampion} is {@code null} and {@code championChanged} is {@code false})
     * @param notes       why points may look unusual this season: "half-points", "shared-points", ... (PLAN.md §7)
     */
    public record ConstructorStandingsResponse(
            int season,
            String system,
            String realSystem,
            String preset,
            boolean alternative,
            ScenarioInfo scenario,
            RulesInfo rules,
            ConstructorRulesInfo constructorRules,
            List<RaceInfo> races,
            List<Entrant> entrants,
            ConstructorChampion champion,
            ConstructorChampion realChampion,
            boolean championChanged,
            List<String> notes,
            List<ConstructorStandingLine> standings) {
    }

    // ---- compare: every system side by side ----

    public record ConstructorCompareSystem(String id, ConstructorChampion champion, boolean championChanged) {
    }

    /** @param cells system id → this team's position and points under that system */
    public record ConstructorCompareTeam(
            String teamId,
            String constructorId,
            String engineManufacturerId,
            String teamName,
            Integer realPosition,
            Map<String, CompareCell> cells) {
    }

    public record ConstructorCompareResponse(
            int season,
            String realSystem,
            boolean alternative,
            List<ConstructorCompareSystem> systems,
            List<ConstructorCompareTeam> teams) {
    }

    // ---- progression: totals race by race ----

    /** @param points championship total (after dropped scores) after each race of {@code races} */
    public record ProgressionTeam(
            String teamId,
            String constructorId,
            String engineManufacturerId,
            String teamName,
            int position,
            List<BigDecimal> points) {
    }

    public record ConstructorClinchInfo(int round, String code, String teamId) {
    }

    /** @param clinch the race after which the title could no longer be lost; null if only at the last race */
    public record ConstructorProgressionResponse(
            int season,
            String system,
            boolean alternative,
            List<ProgressionRace> races,
            List<ProgressionTeam> teams,
            ConstructorClinchInfo clinch) {
    }
}
