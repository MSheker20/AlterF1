package com.msheker.alterf1.data;

import java.math.BigDecimal;

/**
 * One line of a season's real final drivers' standings. Row of {@code alterf1.season_driver_standings}.
 *
 * @param position     championship position, or {@code null} when not classified (e.g. excluded)
 * @param positionText raw F1DB text: "1", "2", ... or e.g. "EX"
 */
public record RealStanding(Integer position, String positionText, String driverId, String driverName, BigDecimal points) {
}
