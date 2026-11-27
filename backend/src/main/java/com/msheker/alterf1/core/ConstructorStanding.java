package com.msheker.alterf1.core;

import java.math.BigDecimal;

/**
 * One constructor team's (chassis + engine) line in a computed championship.
 *
 * @param position             championship position; tied teams (same points and countback) share it
 * @param teamId               team key {@code constructorId + ":" + engineManufacturerId}
 * @param constructorId        chassis constructor id
 * @param engineManufacturerId engine manufacturer id
 * @param name                 display name (e.g. "Cooper Climax", or "Ferrari" when chassis == engine)
 * @param points               points that count (after dropped scores), rounded to 2 decimals
 * @param grossPoints          every point scored, before dropped scores
 * @param wins                 Grand Prix victories counted by the team's scoring results
 * @param podiums              Grand Prix top-3 finishes counted by the team's scoring results
 */
public record ConstructorStanding(
        int position,
        String teamId,
        String constructorId,
        String engineManufacturerId,
        String name,
        BigDecimal points,
        BigDecimal grossPoints,
        int wins,
        int podiums) {
}
