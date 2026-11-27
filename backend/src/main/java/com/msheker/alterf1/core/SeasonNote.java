package com.msheker.alterf1.core;

import java.util.Locale;

/**
 * Something in a scored season that explains unusual points, so the UI can show a short note
 * only when it applies (PLAN.md §7).
 */
public enum SeasonNote {
    /** A race cut short paid half points (and the options applied it). */
    HALF_POINTS,
    /** A race paid double points (2014 Abu Dhabi, and the options applied it). */
    DOUBLE_POINTS,
    /** A shared car's points or a shared fastest lap were split between drivers (1950s). */
    SHARED_POINTS,
    /** Sprints scored under a system without a sprint table: AlterF1's 3-2-1 assumption. */
    SPRINT_ASSUMED,
    /** The system's "best N results" was scaled to this season's length (outside its era). */
    BEST_SCALED,
    /** Some finishers could not score (F2 cars, unregistered cars, penalties). */
    INELIGIBLE;

    /** JSON id: {@code HALF_POINTS} → {@code "half-points"}. */
    public String id() {
        return name().toLowerCase(Locale.ROOT).replace('_', '-');
    }
}
