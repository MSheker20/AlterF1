package com.msheker.alterf1.core;

/**
 * User-adjustable switches on top of a scoring system (PLAN.md §2.2 and §3).
 *
 * @param halfPoints     apply real-life half points for races that were cut short
 * @param doublePoints   when to apply real-life double points (2014 Abu Dhabi)
 * @param includeIndy500 count the Indianapolis 500 (1950-60)
 * @param sprints        score sprint races
 * @param fastestLap     award the system's fastest-lap bonus, if it has one
 */
public record ScoringOptions(
        boolean halfPoints,
        DoublePoints doublePoints,
        boolean includeIndy500,
        boolean sprints,
        boolean fastestLap) {

    public enum DoublePoints {
        /** Never. */
        NEVER,
        /** Only under the system that really used it, in that season. */
        OWN_SYSTEM_ONLY,
        /** Under every system. */
        ALWAYS
    }

    /** "Tarihe sadık", the default preset. */
    public static final ScoringOptions HISTORICAL = new ScoringOptions(true, DoublePoints.OWN_SYSTEM_ONLY, true, true, true);

    /** "Saf sistem": no race multipliers at all. */
    public static final ScoringOptions PURE = new ScoringOptions(false, DoublePoints.NEVER, true, true, true);

    /** "Hepsi açık": every real-life multiplier under every system. */
    public static final ScoringOptions ALL_MULTIPLIERS = new ScoringOptions(true, DoublePoints.ALWAYS, true, true, true);
}
