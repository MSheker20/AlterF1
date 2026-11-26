package com.msheker.alterf1.core;

import java.math.BigDecimal;

/**
 * One driver's line in a computed championship.
 *
 * @param position     championship position; tied drivers (same points and countback) share it
 * @param points       points that count (after dropped scores), rounded to 2 decimals
 * @param grossPoints  every point scored, before dropped scores
 * @param constructorId the team the driver raced most often for that season
 */
public record DriverStanding(
        int position,
        String driverId,
        String driverName,
        String driverAbbreviation,
        String constructorId,
        BigDecimal points,
        BigDecimal grossPoints,
        int wins,
        int podiums) {
}
