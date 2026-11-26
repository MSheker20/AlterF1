package com.msheker.alterf1.core;

import java.math.BigDecimal;

/**
 * Bonus for the fastest lap of a Grand Prix.
 *
 * @param points           bonus points
 * @param maxPosition      only awarded when the driver finished at or above this position
 *                         ({@code null} = no condition, e.g. the 1950s)
 * @param splitWhenShared  when several drivers set the same fastest lap, split the bonus
 */
public record FastestLapRule(BigDecimal points, Integer maxPosition, boolean splitWhenShared) {

    /** 1950-59: one point, any driver, split when shared. */
    public static final FastestLapRule FIFTIES = new FastestLapRule(BigDecimal.ONE, null, true);

    /** 2019-24: one point, only for a top-10 finisher. */
    public static final FastestLapRule TOP_TEN = new FastestLapRule(BigDecimal.ONE, 10, false);

    public boolean eligible(Integer position) {
        return maxPosition == null || (position != null && position <= maxPosition);
    }
}
